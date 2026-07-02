import { applyRateLimit } from '../lib/rateLimit.js';
import { resolveApiKeys, hasAnyKey } from '../lib/keys.js';
import { getUserEmailFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userEmail = getUserEmailFromRequest(req);
  if (!(await applyRateLimit(req, res, 'generate', userEmail))) return;

  try {
    const { provider, systemInstruction, promptText, imageBase64, mimeType, model, frameworkId } = req.body;
    const keys = resolveApiKeys(req.body);

    if (!provider || !systemInstruction || !promptText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!hasAnyKey(keys, provider)) {
      return res.status(400).json({
        error: 'No API key available. Set your key in Settings or configure server-side keys.',
      });
    }

    const frameworkBlock = frameworkId
      ? `\n\nApply the "${frameworkId}" prompt framework rigorously — every section must be present and filled with domain-specific content.`
      : '';

    const fullSystemInstruction = systemInstruction + frameworkBlock;

    const tryGemini = async () => {
      if (!keys.geminiKey) throw new Error('Gemini key missing');
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: keys.geminiKey });

      const contents = [];
      if (imageBase64) {
        contents.push({
          inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' },
        });
      }
      contents.push(promptText);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { temperature: 0.85, systemInstruction: fullSystemInstruction },
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
          messages: [
            { role: 'system', content: fullSystemInstruction },
            { role: 'user', content: promptText },
          ],
          temperature: 0.85,
        }),
      });
      const data = await groqRes.json();
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
          model: model || 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: fullSystemInstruction },
            { role: 'user', content: promptText },
          ],
          temperature: 0.85,
        }),
      });
      const data = await orRes.json();
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
      console.warn(`Primary provider (${provider}) failed:`, primaryError);

      if (!aiResponse && provider !== 'groq' && keys.groqKey) {
        try {
          aiResponse = await tryGroq();
        } catch (err) {
          console.warn('Groq fallback failed:', err.message);
        }
      }

      if (!aiResponse && provider !== 'google' && keys.geminiKey) {
        try {
          aiResponse = await tryGemini();
        } catch (err) {
          console.warn('Gemini fallback failed:', err.message);
        }
      }
    }

    if (!aiResponse) {
      throw new Error(`All generation attempts failed. Primary error: ${primaryError}`);
    }

    return res.status(200).json({ result: aiResponse });
  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
