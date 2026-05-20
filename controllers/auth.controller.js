const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, status: 'APPROVED' }
    });

    // Generate token for auto-login
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'User registered successfully', 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check user status
    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Your account is waiting for admin approval.' });
    }
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account is suspended.' });
    }
    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: 'Your account registration was rejected.' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: 'Email is already in use by another account' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, name: true, email: true }
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, updateProfile };
