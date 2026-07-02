import { applyRateLimit } from '../lib/rateLimit.js';
import { resolveApiKeys, hasAnyKey } from '../lib/keys.js';
import { getUserEmailFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userEmail = getUserEmailFromRequest(req);
  if (!(await applyRateLimit(req, res, 'autocomplete', userEmail))) return;

  try {
    const { provider, sysPrompt } = req.body;
    const keys = resolveApiKeys(req.body);

    if (!provider || !sysPrompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!hasAnyKey(keys, provider)) {
      return res.status(400).json({ error: 'No API key available for autocomplete.' });
    }

    let rawResponseData = null;

    const tryGemini = async () => {
      if (!keys.geminiKey) throw new Error('Gemini key missing');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: keys.geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: sysPrompt,
        config: { temperature: 0.7 },
      });
      return response.text || '';
    };

    const tryGroq = async () => {
      if (!keys.groqKey) throw new Error('Groq key missing');
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${keys.groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: sysPrompt }],
          temperature: 0.7,
        }),
      });
      const data = await groqRes.json();
      rawResponseData = data;
      if (data.error) throw new Error(data.error.message || 'Groq Error');
      return data.choices?.[0]?.message?.content || '';
    };

    const tryOpenRouter = async () => {
      if (!keys.openRouterKey) throw new Error('OpenRouter key missing');
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keys.openRouterKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://promptcrafter-theta.vercel.app',
          'X-Title': 'PromptCrafter',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemma-2-9b-it:free',
          messages: [{ role: 'user', content: sysPrompt }],
          temperature: 0.7,
        }),
      });
      const data = await orRes.json();
      rawResponseData = data;
      if (data.error) throw new Error(data.error.message || 'OpenRouter Error');
      return data.choices?.[0]?.message?.content || '';
    };

    let aiResponse = '';
    let primaryError = null;

    try {
      if (provider === 'google') aiResponse = await tryGemini();
      else if (provider === 'groq') aiResponse = await tryGroq();
      else if (provider === 'openrouter') aiResponse = await tryOpenRouter();
    } catch (e) {
      primaryError = e.message;
      if (!aiResponse && provider !== 'groq' && keys.groqKey) {
        try {
          aiResponse = await tryGroq();
        } catch (err) {
          console.warn('Autocomplete Groq fallback failed:', err.message);
        }
      }
      if (!aiResponse && provider !== 'google' && keys.geminiKey) {
        try {
          aiResponse = await tryGemini();
        } catch (err) {
          console.warn('Autocomplete Gemini fallback failed:', err.message);
        }
      }
    }

    if (!aiResponse) {
      throw new Error(`All generation attempts failed. Primary error: ${primaryError}`);
    }

    let result = '';
    try {
      const match = aiResponse.match(/\[[\s\S]*\]/);
      const jsonStr = match ? match[0] : aiResponse;
      result = JSON.parse(jsonStr);
    } catch {
      result = [aiResponse.substring(0, 150)];
    }

    return res.status(200).json({ result, debug: rawResponseData });
  } catch (error) {
    console.error('Autocomplete API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
