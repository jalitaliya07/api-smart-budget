require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../config/db');

async function main() {
  // Clear existing
  await prisma.expense.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();
  await prisma.bank.deleteMany();
  await prisma.delegateAccess.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@smartbudget.com',
      password: hashedPassword
    }
  });

  const foodCat = await prisma.category.create({ data: { name: 'Food', color: '#10B981' } });
  const rentCat = await prisma.category.create({ data: { name: 'Rent', color: '#6366F1' } });
  const utilCat = await prisma.category.create({ data: { name: 'Utilities', color: '#06B6D4' } });
  const bankCat = await prisma.category.create({ data: { name: 'Bank', color: '#3B82F6' } });
  const cashCat = await prisma.category.create({ data: { name: 'Cash', color: '#10B981' } });

  await prisma.expense.createMany({
    data: [
      { userId: user.id, categoryId: foodCat.id, title: 'Groceries', amount: 150.50, paymentMethod: 'Credit Card', expenseDate: new Date() },
      { userId: user.id, categoryId: rentCat.id, title: 'Monthly Rent', amount: 1200.00, paymentMethod: 'Bank Transfer', expenseDate: new Date() }
    ]
  });

  await prisma.budget.createMany({
    data: [
      { userId: user.id, categoryId: foodCat.id, limitAmount: 400.00, month: new Date().getMonth() + 1, year: new Date().getFullYear() },
      { userId: user.id, categoryId: rentCat.id, limitAmount: 1200.00, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
    ]
  });

  console.log('Database seeded!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
