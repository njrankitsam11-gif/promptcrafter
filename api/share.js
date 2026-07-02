import { kv } from '@vercel/kv';
import { applyRateLimit } from '../lib/rateLimit.js';

const SHARE_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export default async function handler(req, res) {
  if (!(await applyRateLimit(req, res, 'share'))) return;

  try {
    if (req.method === 'POST') {
      const { promptData } = req.body;
      if (!promptData) return res.status(400).json({ error: 'Missing prompt data' });

      const shareId = Math.random().toString(36).substring(2, 8);
      const key = `shared_prompt:${shareId}`;

      await kv.set(key, promptData, { ex: SHARE_TTL_SEC });

      return res.status(200).json({ shareId });
    }

    if (req.method === 'GET') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing share id' });

      const promptData = await kv.get(`shared_prompt:${id}`);
      if (!promptData) return res.status(404).json({ error: 'Prompt not found or expired' });

      return res.status(200).json({ promptData });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('KV Share Error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
}
