import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const phrase = req.query.phrase;
      if (!phrase) return res.status(400).json({ error: 'Missing sync phrase' });
      
      const key = `user_history:${phrase}`;
      const history = await kv.get(key) || [];
      return res.status(200).json({ history });
      
    } else if (req.method === 'POST') {
      const { phrase, history } = req.body;
      if (!phrase || !history) return res.status(400).json({ error: 'Missing phrase or history' });
      
      const key = `user_history:${phrase}`;
      await kv.set(key, history);
      return res.status(200).json({ success: true });
      
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('KV Sync Error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
}
