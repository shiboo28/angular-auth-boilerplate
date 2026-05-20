const jwt = require('jsonwebtoken');
const { Account } = require('../helpers/db');

function authorize(roles = []) {
  // roles param can be a single role string (e.g. 'Admin') or an array of roles
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorised' });
      }

      const token = authHeader.split(' ')[1];
      
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get account from database
      const account = await Account.findByPk(decoded.id);
      
      if (!account || (roles.length && !roles.includes(account.role))) {
        return res.status(401).json({ message: 'Unauthorised' });
      }

      // Attach account to request object for use in route handlers
      req.user = account;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorised' });
    }
  };
}

module.exports = authorize;
