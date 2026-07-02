import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { applyRateLimit } from '../lib/rateLimit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!(await applyRateLimit(req, res, 'auth'))) return;

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userKey = `user:${normalizedEmail}`;

  try {
    const user = await kv.get(userKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({ token, email: normalizedEmail });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
