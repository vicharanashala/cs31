const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const ALLOWED_EMAILS = require('../config/allowedEmails');
const auth = require('../middleware/auth');

// Signup - Email must be in the allowed list
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if email is in the allowed list
  if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
    return res.status(403).json({ 
      message: 'Registration denied. Your email is not on the approved list.' 
    });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Signup successful!',
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, spurtiPoints: newUser.spurtiPoints }
    });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // 1. Check if email exists in Admin collection
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: admin._id, email: admin.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful!',
        token,
        user: { id: admin._id, name: admin.name, email: admin.email, role: 'admin' }
      });
    }

    // 2. If not found in Admin, check User collection (students)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role || 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'student', spurtiPoints: user.spurtiPoints }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user (protected)
router.get('/me', auth, async (req, res) => {
  try {
    let user = await Admin.findById(req.user.id).select('-password');
    let role = 'admin';
    
    if (!user) {
      user = await User.findById(req.user.id).select('-password');
      role = user ? (user.role || 'student') : 'student';
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: role,
        spurtiPoints: user.spurtiPoints
      }
    });
  } catch (err) {
    console.error('Get Me Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;