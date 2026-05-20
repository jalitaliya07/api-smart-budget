require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// trigger restart

// trigger restart 2

// trigger restart 3

// trigger restart 4
