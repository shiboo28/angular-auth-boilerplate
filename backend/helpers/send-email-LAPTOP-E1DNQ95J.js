const nodemailer = require('nodemailer');

// Create Ethereal test account and send email
// Ethereal captures emails for testing without sending real emails
let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // Use configured SMTP settings if available, otherwise create Ethereal test account
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Create Ethereal test account automatically
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal test account created:');
    console.log(`   Email: ${testAccount.user}`);
    console.log(`   Pass:  ${testAccount.pass}`);
    console.log(`   View emails at: https://ethereal.email/login`);
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM || '"Angular Auth App" <noreply@angular-auth.com>',
    to,
    subject,
    html
  });

  // Log Ethereal preview URL for testing
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📧 Preview email: ${previewUrl}`);
  }

  return info;
}

async function sendVerificationEmail(account, origin) {
  const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
  
  await sendEmail({
    to: account.email,
    subject: 'Angular Auth - Verify Your Email',
    html: `
      <h2>Verify Your Email</h2>
      <p>Thanks for registering!</p>
      <p>Please click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you did not register, please ignore this email.</p>
    `
  });
}

async function sendPasswordResetEmail(account, origin) {
  const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
  
  await sendEmail({
    to: account.email,
    subject: 'Angular Auth - Reset Your Password',
    html: `
      <h2>Reset Password</h2>
      <p>Please click the link below to reset your password. The link will be valid for 24 hours:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
