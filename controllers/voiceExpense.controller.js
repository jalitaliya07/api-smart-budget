const prisma = require('../config/db');
const https = require('https');

// Local Regex Fallback Parsing Logic
function fallbackParse(text) {
  const cleanText = text.toLowerCase();
  
  // 1. Parse Amount
  let amount = 0;
  const kMatch = cleanText.match(/\b(\d+)\s*k\b/);
  if (kMatch) {
    amount = parseFloat(kMatch[1]) * 1000;
  } else {
    const amountMatch = cleanText.match(/\b\d+(?:\.\d{1,2})?\b/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[0]);
    }
  }

  // 2. Parse Type
  let type = 'expense';
  const incomeKeywords = ['received', 'earned', 'salary', 'bonus', 'deposit', 'credit', 'credited', 'income', 'get', 'got', 'save'];
  if (incomeKeywords.some(kw => cleanText.includes(kw))) {
    type = 'income';
  }

  // 3. Parse Category & Title
  let category = 'Shopping'; // default fallback
  let title = 'Voice Entry';

  const categoryMap = [
    { keywords: ['pizza', 'burger', 'food', 'lunch', 'dinner', 'grocery', 'groceries', 'kitchen', 'milk', 'vegetables', 'fruit', 'restaurant', 'cafe', 'chai', 'maggi'], name: 'Food' },
    { keywords: ['petrol', 'diesel', 'fuel', 'auto', 'taxi', 'cab', 'uber', 'ola', 'train', 'bus', 'travel', 'transport', 'flight', 'metro'], name: 'Transport' },
    { keywords: ['movie', 'cinema', 'tickets', 'netflix', 'theater', 'game', 'play', 'show', 'concert', 'entertainment'], name: 'Entertainment' },
    { keywords: ['shopping', 'clothes', 'shirt', 'shoes', 'dress', 'watch', 'bag', 'amazon', 'flipkart', 'gift'], name: 'Shopping' },
    { keywords: ['bill', 'recharge', 'electricity', 'water', 'gas', 'wifi', 'internet', 'rent', 'utilities'], name: 'Utilities' },
    { keywords: ['salary', 'income', 'bonus', 'cashback', 'payment'], name: 'Income' }
  ];

  for (const item of categoryMap) {
    const matchedKeyword = item.keywords.find(kw => cleanText.includes(kw));
    if (matchedKeyword) {
      category = item.name;
      title = matchedKeyword;
      break;
    }
  }

  if (title === 'Voice Entry') {
    let cleanTitle = cleanText
      .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
      .replace(/\b(spent|spend|spent on|spent for|on|for|add|received|yesterday|today|amount|of|in|a|an|the|rs|rupees)\b/g, '')
      .trim();
    if (cleanTitle) {
      title = cleanTitle.split(/\s+/)[0];
    }
  }

  title = title.charAt(0).toUpperCase() + title.slice(1);

  return { amount, category, type, title };
}

// Call OpenAI Chat Completion API
function callOpenAI(text) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reject(new Error('OpenAI key missing'));
    }

    const systemPrompt = `You are a financial parsing assistant. Your task is to extract transaction details from natural language text.
You must return a JSON object with:
- amount: (number, defaults to 0 if not found)
- category: (string: "Food", "Transport", "Entertainment", "Shopping", "Utilities", "Income", "Rent", or other appropriate name. Use title case.)
- type: (string: either "expense" or "income". Default is "expense")
- title: (string: short description of the item, e.g., "pizza", "petrol", "salary", "movie")

Respond ONLY with valid JSON. Do not include markdown code block formatting or extra text.`;

    const requestData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.1
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsedRes = JSON.parse(data);
          if (parsedRes.error) {
            return reject(new Error(parsedRes.error.message));
          }
          const content = parsedRes.choices[0].message.content.trim();
          const cleanJson = JSON.parse(content);
          resolve(cleanJson);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.write(requestData);
    req.end();
  });
}

// 1. POST /api/voice-expense/parse
const parseVoiceText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    try {
      const aiResult = await callOpenAI(text);
      res.json({ success: true, method: 'ai', data: aiResult });
    } catch (err) {
      console.warn('AI Parsing failed, falling back to local regex. Reason:', err.message);
      const fallbackResult = fallbackParse(text);
      res.json({ success: true, method: 'regex', data: fallbackResult });
    }
  } catch (error) {
    console.error('Parse voice error:', error);
    res.status(500).json({ error: 'Internal server error during parsing' });
  }
};

// 2. POST /api/voice-expense/save
const saveVoiceTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { voiceText, amount, categoryName, type, title, date } = req.body;

    if (!amount || !categoryName) {
      return res.status(400).json({ error: 'Amount and category are required' });
    }

    // A. Check or create Category
    const categories = await prisma.category.findMany();
    let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

    if (!category) {
      const colors = ['#10B981', '#6366F1', '#3B82F6', '#EF4444', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      category = await prisma.category.create({
        data: { name: categoryName, color: randomColor }
      });
    }

    const transactionDate = date ? new Date(date) : new Date();

    // B. Save actual transaction depending on type
    let savedTransaction;
    if (type === 'income') {
      // Save as Budget (represents income allocation in standard budget reports)
      savedTransaction = await prisma.budget.create({
        data: {
          userId,
          categoryId: category.id,
          limitAmount: parseFloat(amount),
          month: transactionDate.getMonth() + 1,
          year: transactionDate.getFullYear()
        }
      });
    } else {
      // Save as Expense
      savedTransaction = await prisma.expense.create({
        data: {
          userId,
          categoryId: category.id,
          title: title || 'Voice Entry',
          amount: parseFloat(amount),
          notes: `Added via voice: "${voiceText}"`,
          paymentMethod: 'Cash',
          expenseDate: transactionDate
        }
      });
    }

    // C. Save audit log inside VoiceExpense
    const voiceLog = await prisma.voiceExpense.create({
      data: {
        userId,
        voiceText: voiceText || '',
        title: title || 'Voice Entry',
        amount: parseFloat(amount),
        category: categoryName,
        type: type || 'expense'
      }
    });

    res.status(201).json({
      message: 'Transaction successfully processed and saved',
      transaction: savedTransaction,
      voiceLog
    });
  } catch (error) {
    console.error('Save voice transaction error:', error);
    res.status(500).json({ error: 'Internal server error during save' });
  }
};

// 3. GET /api/voice-expense/history
const getVoiceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await prisma.voiceExpense.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(history);
  } catch (error) {
    console.error('Get voice history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. GET /api/voice-expense/analytics
const getVoiceAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const voiceLogs = await prisma.voiceExpense.findMany({
      where: { userId }
    });

    const totalCount = voiceLogs.length;
    const totalSpent = voiceLogs
      .filter(log => log.type === 'expense')
      .reduce((sum, log) => sum + log.amount, 0);
    const totalIncome = voiceLogs
      .filter(log => log.type === 'income')
      .reduce((sum, log) => sum + log.amount, 0);

    // Group by category name
    const categoryBreakdown = {};
    voiceLogs.forEach(log => {
      categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + log.amount;
    });

    res.json({
      totalCount,
      totalSpent,
      totalIncome,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Get voice analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  parseVoiceText,
  saveVoiceTransaction,
  getVoiceHistory,
  getVoiceAnalytics
};
