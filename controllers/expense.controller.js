const prisma = require('../config/db');

const getExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { expenseDate: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createExpense = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { categoryId, title, amount, notes, paymentMethod, expenseDate } = req.body;
    
    const expense = await prisma.expense.create({
      data: {
        userId,
        categoryId: parseInt(categoryId),
        title,
        amount: parseFloat(amount),
        notes,
        paymentMethod,
        expenseDate: new Date(expenseDate)
      },
      include: { category: true }
    });
    res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getExpenses, createExpense, deleteExpense };
