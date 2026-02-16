import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { generateToken } from '../utils/jwt';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Check if user exists
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    const user = await UserModel.create(email, name, passwordHash);
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If password is provided, verify it
    if (password && user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = await import('../utils/jwt');
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

