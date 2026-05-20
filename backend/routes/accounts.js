const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { Account } = require('../helpers/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../helpers/send-email');

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /accounts/authenticate:
 *   post:
 *     summary: Authenticate user credentials
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthenticateRequest'
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthenticateResponse'
 *       400:
 *         description: Email or password is incorrect
 */
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

    // Store refresh token in DB
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

/**
 * @swagger
 * /accounts/refresh-token:
 *   post:
 *     summary: Refresh JWT token using refresh token cookie
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthenticateResponse'
 *       401:
 *         description: Unauthorised
 */
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

/**
 * @swagger
 * /accounts/revoke-token:
 *   post:
 *     summary: Revoke refresh token (logout)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token revoked
 *       401:
 *         description: Unauthorised
 */
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

/**
 * @swagger
 * /accounts/register:
 *   post:
 *     summary: Register a new account
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       200:
 *         description: Registration successful, verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
router.post('/register', async (req, res, next) => {
  try {
    const { title, firstName, lastName, email, password } = req.body;

    // Check if email already exists
    const existing = await Account.findOne({ where: { email } });
    if (existing) {
      // Don't reveal that email is already registered (security best practice)
      return res.json({ message: 'Registration successful, please check your email for verification instructions' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if this is the first account (make it admin)
    const isFirstAccount = (await Account.count()) === 0;

    // Generate verification token
    const verificationToken = crypto.randomBytes(40).toString('hex');

    // Create account — NOT verified until email is confirmed
    const account = await Account.create({
      title,
      firstName,
      lastName,
      email,
      passwordHash,
      role: isFirstAccount ? 'Admin' : 'User',
      verified: null, // Must verify email first
      verificationToken,
      created: new Date()
    });

    // Send verification email
    const origin = req.headers.origin || process.env.CORS_ORIGIN || `${req.protocol}://${req.get('host')}`;
    try {
      await sendVerificationEmail(account, origin);
    } catch (emailErr) {
      console.error('📧 Failed to send verification email:', emailErr.message);
    }

    res.json({ message: 'Registration successful, please check your email for verification instructions' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/verify-email:
 *   post:
 *     summary: Verify email address using token from verification email
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Verification failed
 */
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

/**
 * @swagger
 * /accounts/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success to prevent email enumeration)
 */
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

    // Send password reset email
    const origin = req.headers.origin || process.env.CORS_ORIGIN || `${req.protocol}://${req.get('host')}`;
    try {
      await sendPasswordResetEmail(account, origin);
    } catch (emailErr) {
      console.error('📧 Failed to send password reset email:', emailErr.message);
    }

    res.json({ message: 'Please check your email for password reset instructions' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/validate-reset-token:
 *   post:
 *     summary: Validate a password reset token
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid token
 */
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

/**
 * @swagger
 * /accounts/reset-password:
 *   post:
 *     summary: Reset password using token from reset email
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token
 */
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

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorised
 */
router.get('/', authorize(), async (req, res, next) => {
  try {
    const accounts = await Account.findAll();
    res.json(accounts.map(a => basicDetails(a)));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorised
 *       404:
 *         description: Account not found
 */
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

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       200:
 *         description: Account created
 *       401:
 *         description: Unauthorised
 */
router.post('/', authorize('Admin'), async (req, res, next) => {
  try {
    const { title, firstName, lastName, email, password, role } = req.body;

    const existing = await Account.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email is already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    const account = await Account.create({
      title,
      firstName,
      lastName,
      email,
      passwordHash,
      role: role || 'User',
      verified: new Date(),
      created: new Date()
    });

    res.json(basicDetails(account));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Update an account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, User]
 *     responses:
 *       200:
 *         description: Account updated
 *       401:
 *         description: Unauthorised
 *       404:
 *         description: Account not found
 */
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

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Unauthorised
 *       404:
 *         description: Account not found
 */
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
