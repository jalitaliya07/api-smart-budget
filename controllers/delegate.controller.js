const crypto = require('crypto');
const prisma = require('../config/db');
const transporter = require('../config/mailer');

/**
 * POST /api/delegate/generate-passkey
 * Called by User1 (logged in) to create a passkey for someone else to access their account.
 * Returns the 8-char passkey.
 */
const generatePasskey = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;

    // Check if user already has a passkey
    const existing = await prisma.delegateAccess.findFirst({
      where: { ownerUserId }
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already generated a passkey.' });
    }

    // Generate a unique 8-character alphanumeric passkey
    const passkey = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9C1D2"

    // Permanent passkey (expires in 100 years)
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

    const record = await prisma.delegateAccess.create({
      data: { passkey, ownerUserId, expiresAt },
    });

    res.json({
      passkey: record.passkey,
      expiresAt: record.expiresAt,
      message: 'Permanent passkey generated. Share it with the person you want to grant access to.',
    });
  } catch (error) {
    console.error('generatePasskey error:', error);
    res.status(500).json({ error: 'Failed to generate passkey' });
  }
};

/**
 * POST /api/delegate/access
 * Called by User2 (NOT logged in) to access User1's account using the passkey.
 * Returns a JWT token with User1's data, and simulates sending an email notification.
 */
const accessViaPasskey = async (req, res) => {
  try {
    const { passkey, guestName, guestEmail } = req.body;

    if (!passkey) {
      return res.status(400).json({ error: 'Passkey is required' });
    }

    const record = await prisma.delegateAccess.findUnique({
      where: { passkey: passkey.toUpperCase() },
      include: { ownerUser: true },
    });

    if (!record) {
      return res.status(404).json({ error: 'Invalid passkey. Please check and try again.' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ error: 'This passkey has expired.' });
    }

    if (!guestName || !guestEmail) {
      return res.status(400).json({ error: 'Name and email are required to request access.' });
    }

    const ownerUserId = record.ownerUserId;

    // Check if there is an existing record for this owner with the same guestEmail
    const sameEmailRecord = await prisma.delegateAccess.findFirst({
      where: {
        ownerUserId,
        guestEmail: guestEmail.trim()
      }
    });

    if (sameEmailRecord) {
      // If email found but guestName is different, return error
      if (sameEmailRecord.guestName !== guestName.trim()) {
        return res.status(400).json({ error: 'email already have user' });
      }

      // If both name and email are same, check their status
      if (sameEmailRecord.status === 'APPROVED') {
        const jwt = require('jsonwebtoken');

        if (!sameEmailRecord.isUsed) {
          await prisma.delegateAccess.update({
            where: { id: sameEmailRecord.id },
            data: { isUsed: true, usedAt: new Date() },
          });
        }

        // Issue a JWT token for the OWNER's account
        const token = jwt.sign(
          { userId: record.ownerUser.id, isDelegated: true, guestName: sameEmailRecord.guestName },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );

        return res.json({
          token,
          user: {
            id: record.ownerUser.id,
            name: record.ownerUser.name,
            email: record.ownerUser.email,
            isDelegated: true,
            accessedBy: sameEmailRecord.guestName,
          },
          message: `You now have access to ${record.ownerUser.name}'s account.`,
        });
      }

      if (sameEmailRecord.status === 'PENDING') {
        return res.status(403).json({ error: 'Your request is still waiting for the account owner to approve.' });
      }

      if (sameEmailRecord.status === 'REJECTED') {
        return res.status(403).json({ error: 'Your request was rejected by the account owner.' });
      }
    }

    // Otherwise, send a new request (create a new delegate record in the database)
    const tempPasskey = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

    await prisma.delegateAccess.create({
      data: {
        passkey: tempPasskey,
        ownerUserId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        status: 'PENDING',
        expiresAt
      }
    });

    return res.status(202).json({
      message: 'Your request has been sent to the account owner for approval.',
      status: 'PENDING'
    });
  } catch (error) {
    console.error('accessViaPasskey error:', error);
    res.status(500).json({ error: 'Failed to verify passkey' });
  }
};

/**
 * GET /api/delegate/my-passkey
 * Returns the currently active (unused, not expired) passkey for the logged-in user.
 */
const getMyPasskey = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;

    const record = await prisma.delegateAccess.findFirst({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.json({ passkey: null, message: 'No active passkey. Generate one to share access.' });
    }

    res.json({ passkey: record.passkey, expiresAt: record.expiresAt });
  } catch (error) {
    console.error('getMyPasskey error:', error);
    res.status(500).json({ error: 'Failed to fetch passkey' });
  }
};

const sendNewPasskeyEmail = async (email, name, newPasskey) => {
  try {
    await transporter.sendMail({
      from: '"SmartBudget Pro" <jalitaliya0@gmail.com>',
      to: email,
      subject: 'Your Access Passkey Has Been Updated',
      text: `Hello ${name},\n\nThe account owner has regenerated their delegate passkey. Your new passkey to access their account is: ${newPasskey}\n\nBest regards,\nSmartBudget Pro Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Your Passkey Has Been Updated</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>The account owner has regenerated their delegate passkey.</p>
          <p>Your new permanent passkey to access their account is:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #0f172a; margin: 20px 0;">
            ${newPasskey}
          </div>
          <p>Please use this new passkey for future logins.</p>
          <br/>
          <p>Best regards,<br/>SmartBudget Pro Team</p>
        </div>
      `
    });
    console.log(`New passkey email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send new passkey email to ${email}:`, err);
  }
};

const regeneratePasskey = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;

    // 1. Generate a new unique main passkey for the owner
    const newMainPasskey = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

    // Find the current active/unused passkey for this owner, if any
    const latestRecord = await prisma.delegateAccess.findFirst({
      where: { ownerUserId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestRecord && latestRecord.status === 'UNUSED') {
      // If the latest record is UNUSED, update it with the new passkey
      await prisma.delegateAccess.update({
        where: { id: latestRecord.id },
        data: { passkey: newMainPasskey },
      });
    } else {
      // Otherwise, create a new UNUSED passkey record for the owner
      await prisma.delegateAccess.create({
        data: { passkey: newMainPasskey, ownerUserId, expiresAt },
      });
    }

    // 2. Find all APPROVED delegate records for this owner
    const approvedGuests = await prisma.delegateAccess.findMany({
      where: { ownerUserId, status: 'APPROVED' },
    });

    // 3. Update each approved guest's passkey and send them the new one via email
    for (const guest of approvedGuests) {
      // Generate a new unique 8-character passkey for this specific guest
      const newGuestPasskey = crypto.randomBytes(4).toString('hex').toUpperCase();

      await prisma.delegateAccess.update({
        where: { id: guest.id },
        data: { passkey: newGuestPasskey },
      });

      if (guest.guestEmail) {
        await sendNewPasskeyEmail(guest.guestEmail, guest.guestName, newGuestPasskey);
      }
    }

    res.json({
      passkey: newMainPasskey,
      expiresAt,
      message: 'Passkey regenerated successfully. Approved guests have been sent their new passkeys via email.',
    });
  } catch (error) {
    console.error('regeneratePasskey error:', error);
    res.status(500).json({ error: 'Failed to regenerate passkey' });
  }
};

module.exports = { generatePasskey, accessViaPasskey, getMyPasskey, regeneratePasskey };
