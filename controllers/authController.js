import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/emailService.js';

// @desc    Register a new user (Student)
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, semester } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let finalRole = 'student';
    if (role === 'admin') {
      const adminExists = await User.findOne({ role: 'admin' });
      if (adminExists) {
        return res.status(403).json({ message: 'Only one admin allowed in the system.' });
      }
      finalRole = 'admin';
    }

    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
      semester: finalRole === 'student' ? semester : undefined,
    });

    if (user) {
      // Send Registration Confirmation Email
      await sendEmail({
        to: user.email,
        subject: 'Registration Successful - Project Submission System',
        text: `Hello ${user.name},\n\nYou have successfully registered for the PPT-Based Plagiarism Detection and Project Submission System as a ${user.role}.`
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data received' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    User Login
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin Login
// @route   POST /api/auth/admin-login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Specifically search for admin role to restrict to Admin
    const user = await User.findOne({ email, role: 'admin' }).select('+password');

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials or unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
