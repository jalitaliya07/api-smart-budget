const prisma = require('../config/db');

const getBudgets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    let whereClause = { userId };
    if (month && year) {
      whereClause.month = parseInt(month);
      whereClause.year = parseInt(year);
    }

    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: { category: true }
    });
    res.json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createBudget = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { categoryId, limitAmount, month, year, bankName } = req.body;
    
    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: parseInt(categoryId),
        limitAmount: parseFloat(limitAmount),
        month: parseInt(month),
        year: parseInt(year),
        bankName: bankName || null
      },
      include: { category: true }
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getBudgets, createBudget };
