export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, apiKey, sysPrompt } = req.body;

    if (!provider || !apiKey || !sysPrompt) {
      return res.status(400).json({ error: 'Missing required fields: provider, apiKey, sysPrompt' });
    }

    let aiResponse = '';
    let rawResponseData = null;

    if (provider === 'google') {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: sysPrompt,
        config: { temperature: 0.7 }
      });
      aiResponse = response.text || '';
    } 
    else if (provider === 'groq') {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: sysPrompt }],
          temperature: 0.7
        })
      });
      const data = await groqRes.json();
      rawResponseData = data;
      if (data.error) throw new Error(data.error.message || 'Groq Error');
      aiResponse = data.choices?.[0]?.message?.content || '';
    } 
    else if (provider === 'openrouter') {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://promptcrafter-theta.vercel.app',
          'X-Title': 'PromptCrafter',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemma-2-9b-it:free',
          messages: [{ role: 'user', content: sysPrompt }],
          temperature: 0.7
        })
      });
      const data = await orRes.json();
      rawResponseData = data;
      if (data.error) throw new Error(data.error.message || 'OpenRouter Error');
      aiResponse = data.choices?.[0]?.message?.content || '';
    }
    else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    return res.status(200).json({ result: aiResponse, debug: rawResponseData });

  } catch (error) {
    console.error('Autocomplete API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
