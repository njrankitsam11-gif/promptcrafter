export function resolveApiKeys(body) {
  const { geminiKey, groqKey, openRouterKey } = body;

  return {
    geminiKey: geminiKey || process.env.GEMINI_API_KEY || null,
    groqKey: groqKey || process.env.GROQ_API_KEY || null,
    openRouterKey: openRouterKey || process.env.OPENROUTER_API_KEY || null,
    usingServerKeys: {
      gemini: !geminiKey && !!process.env.GEMINI_API_KEY,
      groq: !groqKey && !!process.env.GROQ_API_KEY,
      openrouter: !openRouterKey && !!process.env.OPENROUTER_API_KEY,
    },
  };
}

export function hasAnyKey(keys, provider) {
  if (provider === 'google') return !!keys.geminiKey;
  if (provider === 'groq') return !!keys.groqKey;
  if (provider === 'openrouter') return !!keys.openRouterKey;
  return !!(keys.geminiKey || keys.groqKey || keys.openRouterKey);
}
