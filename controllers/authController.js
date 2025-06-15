import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// REGISTER CONTROLLER
export const register = async (req, res) => {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hash,
      photo: req.body.photo,
      role: req.body.role || "user", // Default to 'user' if not sent
    });

    const savedUser = await newUser.save();
    const { password, ...userData } = savedUser._doc;

    // Generate token
    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15d" }
    );

    res.status(200).json({
      success: true,
      message: "User registered successfully!",
      token,
      data: userData,
      role: savedUser.role,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: err.message,
    });
  }
};

// LOGIN CONTROLLER - FIXED
export const login = async (req, res) => {
  const { identifier, password } = req.body;
  const debugToken = req.headers["x-debug-token"] || "no-debug-token";

  console.log(`[${debugToken}] Login attempt for identifier: ${identifier}`);

  try {
    // Find user by email OR username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      console.log(
        `[${debugToken}] User not found with identifier: ${identifier}`
      );
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log(
      `[${debugToken}] User found: ${user.username} (ID: ${user._id})`
    );
    console.log(
      `[${debugToken}] Stored password hash: ${user.password.substring(
        0,
        10
      )}...`
    );

    // Debug info about password
    console.log(
      `[${debugToken}] Password received: ${password ? "********" : "empty"}`
    );
    console.log(
      `[${debugToken}] Password length: ${password ? password.length : 0}`
    );

    // Try both sync and async password comparison methods for debugging
    let asyncCompareResult;
    try {
      asyncCompareResult = await bcrypt.compare(password, user.password);
      console.log(
        `[${debugToken}] Async compare result: ${asyncCompareResult}`
      );
    } catch (error) {
      console.error(`[${debugToken}] Async compare error:`, error);
    }

    let syncCompareResult;
    try {
      syncCompareResult = bcrypt.compareSync(password, user.password);
      console.log(`[${debugToken}] Sync compare result: ${syncCompareResult}`);
    } catch (error) {
      console.error(`[${debugToken}] Sync compare error:`, error);
    }

    // Use the result from the async comparison
    const checkCorrectPassword = asyncCompareResult;

    // If password doesn't match
    if (!checkCorrectPassword) {
      console.log(`[${debugToken}] Password verification failed`);
      return res
        .status(401)
        .json({ success: false, message: "Incorrect email or password" });
    }

    // If we reach here, password is correct
    console.log(`[${debugToken}] Password verification successful`);

    // Generate JWT token with user info
    const { password: _, ...userData } = user._doc;

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY ||
        "fallback-secret-key-for-jwt-do-not-use-in-production",
      { expiresIn: "15d" }
    );

    console.log(`[${debugToken}] Generated JWT token`);

    // Prepare response data
    const responseData = {
      success: true,
      token,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        photo: user.photo,
        ...userData,
      },
      role: user.role,
    };

    console.log(`[${debugToken}] Sending successful response`);

    // Set cookie and send response
    return res
      .cookie("accessToken", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        sameSite: "lax", // Helps with CORS
        // secure: true, // Uncomment in production with HTTPS
      })
      .status(200)
      .json(responseData);
  } catch (error) {
    console.error(`[${debugToken}] Login error:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};
