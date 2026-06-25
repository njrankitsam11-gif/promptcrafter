export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, apiKey, systemInstruction, promptText, imageBase64, mimeType, model } = req.body;

    if (!provider || !apiKey || !systemInstruction || !promptText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let aiResponse = '';

    if (provider === 'google') {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      
      const contents = [];
      
      if (imageBase64) {
         contents.push({
           inlineData: {
             data: imageBase64,
             mimeType: mimeType || 'image/jpeg'
           }
         });
      }
      contents.push(promptText);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { 
          temperature: 0.9,
          systemInstruction: systemInstruction
        }
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
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: promptText }
          ],
          temperature: 0.9
        })
      });
      const data = await groqRes.json();
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
          model: model || 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: promptText }
          ],
          temperature: 0.9
        })
      });
      const data = await orRes.json();
      if (data.error) throw new Error(data.error.message || 'OpenRouter Error');
      aiResponse = data.choices?.[0]?.message?.content || '';
    }
    else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    return res.status(200).json({ result: aiResponse });

  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
