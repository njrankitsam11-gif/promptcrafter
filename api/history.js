import { kv } from '@vercel/kv';
import { getUserEmailFromRequest } from '../lib/auth.js';

const MAX_HISTORY_ITEMS = 100;
const PAGE_SIZE = 20;

export default async function handler(req, res) {
  const userId = getUserEmailFromRequest(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  const historyKey = `history:${userId}`;

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const allHistory = (await kv.get(historyKey)) || [];
      const total = allHistory.length;
      const start = (page - 1) * PAGE_SIZE;
      const history = allHistory.slice(start, start + PAGE_SIZE);

      return res.status(200).json({
        history,
        pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
      });
    }

    if (req.method === 'POST') {
      const { history } = req.body;
      if (!history) return res.status(400).json({ error: 'Missing history data' });

      const trimmed = Array.isArray(history) ? history.slice(0, MAX_HISTORY_ITEMS) : [];
      await kv.set(historyKey, trimmed);
      return res.status(200).json({ success: true, count: trimmed.length });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('KV History Error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
}
