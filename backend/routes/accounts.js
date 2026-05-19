const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { Account } = require('../helpers/db');

// ==================== PUBLIC ROUTES ====================

// POST /accounts/authenticate
router.post('/authenticate', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find account with password hash included
    const account = await Account.scope('withHash').findOne({ where: { email } });

    if (!account || !account.verified || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(400).json({ message: 'Email or password is incorrect' });
    }

    // Generate tokens
    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken();

    // Save refresh token as a cookie
    setRefreshTokenCookie(res, refreshToken);

    // Store refresh token in DB (using resetToken field for simplicity, or you can add a separate table)
    // For now we'll store it simply - in production you'd want a RefreshToken table
    account.resetToken = refreshToken;
    account.resetTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await account.save();

    res.json({
      ...basicDetails(account),
      jwtToken
    });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/refresh-token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'Unauthorised' });

    const account = await Account.scope('withHash').findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!account) return res.status(401).json({ message: 'Unauthorised' });

    // Generate new tokens
    const jwtToken = generateJwtToken(account);
    const newRefreshToken = generateRefreshToken();

    // Update refresh token
    account.resetToken = newRefreshToken;
    account.resetTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await account.save();

    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      ...basicDetails(account),
      jwtToken
    });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/revoke-token
router.post('/revoke-token', authorize(), async (req, res, next) => {
  try {
    const account = req.user;
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();

    res.clearCookie('refreshToken');
    res.json({ message: 'Token revoked' });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/register
router.post('/register', async (req, res, next) => {
  try {
    const { title, firstName, lastName, email, password } = req.body;

    // Check if email already exists
    const existing = await Account.findOne({ where: { email } });
    if (existing) {
      // Don't reveal that email is already registered (security best practice)
      // But still return 200 to not leak info
      return res.json({ message: 'Registration successful, please check your email for verification instructions' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if this is the first account (make it admin)
    const isFirstAccount = (await Account.count()) === 0;

    // Create account - auto-verified for now (no email service)
    const account = await Account.create({
      title,
      firstName,
      lastName,
      email,
      passwordHash,
      role: isFirstAccount ? 'Admin' : 'User',
      verified: new Date(), // Auto-verify (remove this line if you add email verification)
      verificationToken: null,
      created: new Date()
    });

    res.json({ message: 'Registration successful' });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/verify-email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    const account = await Account.findOne({ where: { verificationToken: token } });
    if (!account) return res.status(400).json({ message: 'Verification failed' });

    account.verified = new Date();
    account.verificationToken = null;
    await account.save();

    res.json({ message: 'Verification successful, you can now login' });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    const account = await Account.findOne({ where: { email } });

    // Always return ok to prevent email enumeration
    if (!account) return res.json({ message: 'Please check your email for password reset instructions' });

    // Generate reset token
    account.resetToken = crypto.randomBytes(40).toString('hex');
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await account.save();

    // In production, send email here with reset link
    // For now, log the token for testing
    console.log(`🔑 Password reset token for ${email}: ${account.resetToken}`);

    res.json({ message: 'Please check your email for password reset instructions' });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/validate-reset-token
router.post('/validate-reset-token', async (req, res, next) => {
  try {
    const { token } = req.body;

    const account = await Account.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!account) return res.status(400).json({ message: 'Invalid token' });

    res.json({ message: 'Token is valid' });
  } catch (err) {
    next(err);
  }
});

// POST /accounts/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const account = await Account.scope('withHash').findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!account) return res.status(400).json({ message: 'Invalid token' });

    // Update password
    account.passwordHash = await bcrypt.hash(password, 10);
    account.verified = new Date();
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();

    res.json({ message: 'Password reset successful, you can now login' });
  } catch (err) {
    next(err);
  }
});

// ==================== PROTECTED ROUTES ====================

// GET /accounts — get all accounts (any authenticated user)
router.get('/', authorize(), async (req, res, next) => {
  try {
    const accounts = await Account.findAll();
    res.json(accounts.map(a => basicDetails(a)));
  } catch (err) {
    next(err);
  }
});

// GET /accounts/:id — get account by id
router.get('/:id', authorize(), async (req, res, next) => {
  try {
    // Users can only get their own account, admins can get any
    if (Number(req.params.id) !== req.user.id && req.user.role !== 'Admin') {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    const account = await Account.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    res.json(basicDetails(account));
  } catch (err) {
    next(err);
  }
});

// PUT /accounts/:id — update account
router.put('/:id', authorize(), async (req, res, next) => {
  try {
    // Users can only update their own account, admins can update any
    if (Number(req.params.id) !== req.user.id && req.user.role !== 'Admin') {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    const account = await Account.scope('withHash').findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const { title, firstName, lastName, email, password, role } = req.body;

    // Update fields
    if (title !== undefined) account.title = title;
    if (firstName !== undefined) account.firstName = firstName;
    if (lastName !== undefined) account.lastName = lastName;
    if (email !== undefined) account.email = email;
    if (password) account.passwordHash = await bcrypt.hash(password, 10);
    
    // Only admins can change roles
    if (role !== undefined && req.user.role === 'Admin') {
      account.role = role;
    }

    account.updated = new Date();
    await account.save();

    res.json(basicDetails(account));
  } catch (err) {
    next(err);
  }
});

// DELETE /accounts/:id — delete account
router.delete('/:id', authorize(), async (req, res, next) => {
  try {
    // Users can only delete their own account, admins can delete any
    if (Number(req.params.id) !== req.user.id && req.user.role !== 'Admin') {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    const account = await Account.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    await account.destroy();
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ==================== HELPER FUNCTIONS ====================

function basicDetails(account) {
  const { id, title, firstName, lastName, email, role, created, verified } = account;
  return {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    dateCreated: created,
    isVerified: !!verified
  };
}

function generateJwtToken(account) {
  return jwt.sign(
    { id: account.id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function setRefreshTokenCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    sameSite: 'none',
    secure: true
  });
}

module.exports = router;
