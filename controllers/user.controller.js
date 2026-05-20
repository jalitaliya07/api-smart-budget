const prisma = require('../config/db');
const transporter = require('../config/mailer');

const sendApprovalEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: '"SmartBudget Pro" <jalitaliya0@gmail.com>',
      to: email,
      subject: 'Account Access Approved Successfully',
      text: `Hello ${name},\n\nYour passkey access request has been approved. You can now login to SmartBudget Pro using your passkey.\n\nBest regards,\nSmartBudget Pro Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Access Approved Successfully</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your passkey access request has been approved. You can now login to SmartBudget Pro using the passkey.</p>
          <br/>
          <p>Best regards,<br/>SmartBudget Pro Team</p>
        </div>
      `
    });
    console.log(`Approval email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send email to ${email}:`, err);
  }
};

const getUsers = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = { ownerUserId, status: { not: 'UNUSED' } };
    if (search) {
      whereClause.OR = [
        { guestName: { contains: search } },
        { guestEmail: { contains: search } }
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const requests = await prisma.delegateAccess.findMany({
      where: whereClause,
      skip: skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, passkey: true, guestName: true, guestEmail: true, status: true, createdAt: true, expiresAt: true }
    });

    // Map to User interface expected by frontend
    const users = requests.map(r => ({
      id: r.id,
      name: r.guestName || 'Unknown',
      email: r.guestEmail || 'Unknown',
      role: 'GUEST',
      status: r.status,
      createdAt: r.createdAt
    }));

    const total = await prisma.delegateAccess.count({ where: whereClause });

    // Stats
    const stats = {
      total: await prisma.delegateAccess.count({ where: { ownerUserId, status: { not: 'UNUSED' } } }),
      pending: await prisma.delegateAccess.count({ where: { ownerUserId, status: 'PENDING' } }),
      approved: await prisma.delegateAccess.count({ where: { ownerUserId, status: 'APPROVED' } }),
      suspended: await prisma.delegateAccess.count({ where: { ownerUserId, status: 'REJECTED' } }) // map REJECTED to suspended in UI
    };

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const { id } = req.params;
    let { status } = req.body;

    if (status === 'SUSPENDED') status = 'REJECTED'; // Map UI suspended to REJECTED

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await prisma.delegateAccess.findFirst({ where: { id: parseInt(id), ownerUserId } });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const updated = await prisma.delegateAccess.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // Send email if status changed to APPROVED
    if (status === 'APPROVED' && request.status !== 'APPROVED' && updated.guestEmail) {
      await sendApprovalEmail(updated.guestEmail, updated.guestName);
    }

    res.json({ message: 'Status updated successfully', user: {
      id: updated.id,
      name: updated.guestName,
      email: updated.guestEmail,
      status: updated.status === 'REJECTED' ? 'SUSPENDED' : updated.status,
      role: 'GUEST'
    } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

module.exports = { getUsers, updateUserStatus };
