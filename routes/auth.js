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

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    
    // The token contains { id: admin._id, role: admin.role }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // We removed the manager block here. Since we search using decoded.id, 
    // the user is strictly locked to only modifying their own account.

    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(404).json({ message: 'User not found' });

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Password updated successfully!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password change' });
  }
});

export default router;