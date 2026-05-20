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

const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { limitAmount, bankName, categoryId } = req.body;
    
    const budget = await prisma.budget.update({
      where: { id: parseInt(id) },
      data: {
        categoryId: parseInt(categoryId),
        limitAmount: parseFloat(limitAmount),
        bankName: bankName || null
      },
      include: { category: true }
    });
    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.budget.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
