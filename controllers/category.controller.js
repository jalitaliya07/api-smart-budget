const prisma = require('../config/db');

const getAllCategories = async (req, res) => {
  try {
    let categories = await prisma.category.findMany();
    const hasBank = categories.some(c => c.name.toLowerCase() === 'bank');
    const hasCash = categories.some(c => c.name.toLowerCase() === 'cash');
    
    if (!hasBank) {
      const bank = await prisma.category.create({ data: { name: 'Bank', color: '#3B82F6' } });
      categories.push(bank);
    }
    if (!hasCash) {
      const cash = await prisma.category.create({ data: { name: 'Cash', color: '#10B981' } });
      categories.push(cash);
    }

    const hasFood = categories.some(c => c.name.toLowerCase() === 'food');
    const hasRent = categories.some(c => c.name.toLowerCase() === 'rent');
    const hasUtilities = categories.some(c => c.name.toLowerCase() === 'utilities');

    if (!hasFood) {
      const food = await prisma.category.create({ data: { name: 'Food', color: '#10B981' } });
      categories.push(food);
    }
    if (!hasRent) {
      const rent = await prisma.category.create({ data: { name: 'Rent', color: '#6366F1' } });
      categories.push(rent);
    }
    if (!hasUtilities) {
      const utilities = await prisma.category.create({ data: { name: 'Utilities', color: '#06B6D4' } });
      categories.push(utilities);
    }
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;
    const category = await prisma.category.create({
      data: { name, color }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllCategories, createCategory, deleteCategory };
