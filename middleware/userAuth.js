const jwt = require('jsonwebtoken');

// A basic in-memory rate-limiting middleware
const rateLimit = (limit, windowMs) => {
  const requests = new Map();
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests.entries()) {
      if (value.timestamp + windowMs < now) {
        requests.delete(key);
      }
    }
  }, windowMs);

  // Stop cleanup interval if process exits
  cleanupInterval.unref();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, { count: 0, timestamp: now });
    }

    const requestData = requests.get(key);
    requestData.count++;

    if (requestData.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    next();
  };
};

// Authentication middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
    // Check for token in the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. No token provided.'
      });
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'shopzeo-secret-key');

    // Attach the decoded token payload to the request object
    req.user = {
      id: decodedToken.id,
      email: decodedToken.email,
      phone: decodedToken.phone,
      role: decodedToken.role
    };

    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid token.',
      error: error.message
    });
  }
};

module.exports = {
  rateLimit,
  authenticateToken
};