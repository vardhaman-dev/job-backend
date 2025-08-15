const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  // Setup transporter (Gmail example, configure as needed)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,   // your Gmail address in .env
      pass: process.env.EMAIL_PASS,   // your Gmail app password in .env
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
