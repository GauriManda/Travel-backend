import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to access this resource",
      });
    }

    const token = authHeader.split(" ")[1];

    // Updated to use JWT_SECRET_KEY instead of JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Set user information consistently
    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username, // Include if available in token
    };

    // Keep backward compatibility
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }
    next();
  });
};

export const verifyUser = (req, res, next) => {
  verifyToken(req, res, () => {
    const targetUserId = req.params.userId || req.params.id;

    if (req.user.id === targetUserId || req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own account.",
      });
    }
  });
};

export const verifyBookingUser = (req, res, next) => {
  verifyToken(req, res, () => {
    // This middleware simply verifies that the user is authenticated
    // No additional authorization checks are needed
    next();
  });
};
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, but continue without authentication
      req.user = null;
      req.userId = null;
      req.userRole = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username,
    };

    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (err) {
    // Token is invalid, but continue without authentication
    req.user = null;
    req.userId = null;
    req.userRole = null;
    next();
  }
};
