import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if the user exists
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 2. Check if the password matches the hashed password in MongoDB
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 3. Generate the JWT Token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } 
    );

    // 4. Send the user data and token back to React
    res.json({
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      token: token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/auth/create-admin
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 1. Check if user already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // 2. Create the user 
    // (Because you have matchPassword on your model, your Admin schema 
    // likely hashes this automatically when .save() is called)
    const newAdmin = new Admin({
      username,
      password,
      role: role || 'staff' 
    });

    await newAdmin.save();
    res.status(201).json({ message: 'New admin created successfully!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during creation' });
  }
});

export default router;