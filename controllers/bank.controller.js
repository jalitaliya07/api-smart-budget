const prisma = require('../config/db');

const getAllBanks = async (req, res) => {
  try {
    let banks = await prisma.bank.findMany();
    if (banks.length === 0) {
      // Seed default banks
      const defaults = [
        { name: 'HDFC Bank', color: '#1E3A8A' },
        { name: 'State Bank of India (SBI)', color: '#0284C7' },
        { name: 'ICICI Bank', color: '#EA580C' },
        { name: 'Axis Bank', color: '#86198F' },
        { name: 'Kotak Mahindra Bank', color: '#B45309' }
      ];
      await prisma.bank.createMany({ data: defaults });
      banks = await prisma.bank.findMany();
    }
    res.json(banks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createBank = async (req, res) => {
  try {
    const { name, color } = req.body;
    const bank = await prisma.bank.create({
      data: { name, color }
    });
    res.status(201).json(bank);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteBank = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bank.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllBanks, createBank, deleteBank };
