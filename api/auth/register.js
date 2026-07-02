import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { applyRateLimit } from '../lib/rateLimit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';
const MAX_USERS = 500;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!(await applyRateLimit(req, res, 'auth'))) return;

  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid email or password (min 6 chars)' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userKey = `user:${normalizedEmail}`;

  try {
    const existingUser = await kv.get(userKey);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const userCount = (await kv.get('meta:user_count')) || 0;
    if (userCount >= MAX_USERS) {
      return res.status(503).json({ error: 'Registration is full. Contact the administrator.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const userData = {
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    await kv.set(userKey, userData);
    await kv.set('meta:user_count', userCount + 1);

    const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({ token, email: normalizedEmail });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
