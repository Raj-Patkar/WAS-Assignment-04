require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;

// ===============================
// SECURITY CONFIGURATION
// ===============================

// Security headers
app.use(helmet());

// Parse JSON requests
app.use(express.json());

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 30 * 60 * 1000
    }
  })
);

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many login attempts. Please try again later."
  }
});

// Apply rate limiting to login endpoint later
app.use("/api/login", loginLimiter);

// Serve frontend
app.use(express.static("public"));

// ===============================
// TEST ROUTE
// ===============================

app.get("/api/test", (req, res) => {
  res.json({
    message: "Secure Complaint Portal API is running",
    security: {
      helmet: true,
      sessions: true,
      rateLimiting: true
    }
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(`Secure Complaint Portal running on http://localhost:${PORT}`);
});