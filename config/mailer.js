const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jalitaliya0@gmail.com',
    pass: 'nywe owyj iusl lnhm'
  }
});

module.exports = transporter;
