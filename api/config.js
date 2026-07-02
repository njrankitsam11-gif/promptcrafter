export default async function handler(_req, res) {
  return res.status(200).json({
    serverKeys: {
      gemini: !!process.env.GEMINI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
    },
    maxUsers: 500,
  });
}
