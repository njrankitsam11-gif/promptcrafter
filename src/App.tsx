import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Settings, Copy, Check, Loader2, X, History as HistoryIcon, Trash2, Dices, ChevronDown, ChevronUp, Eraser, FileText, Globe, Flame, ArrowLeft, MessageSquare, Share2, Download, Lock, Unlock, UserCircle, LogOut } from 'lucide-react';
import { PromptTester } from './components/PromptTester';
import { AuthModal } from './components/AuthModal';
import { encryptData, decryptData } from './lib/crypto';
import { PROMPT_FRAMEWORKS, getRecommendedFramework, buildFrameworkSystemPreamble } from './lib/promptFrameworks';
import './App.css';
import { SUGGESTIONS } from './suggestions';

interface HistoryItem {
  id: string;
  shortIdea: string;
  fullPrompt: string;
  timestamp: number;
}

const STYLE_CATEGORIES = {
  Visual: [
    {
      category: 'Artistic Styles',
      options: ['Cyberpunk', 'Anime', 'Watercolor', 'Oil Painting', 'Minimalist', 'Retro 80s', 'Steampunk', 'Concept Art']
    },
    {
      category: 'Photography/Camera',
      options: ['Cinematic', 'Photorealistic', 'Macro Photography', 'Drone/Aerial', 'Polaroid', 'Studio Lighting', '35mm Film', 'Fisheye Lens']
    },
    {
      category: 'Lighting & Rendering',
      options: ['Volumetric Lighting', 'Bioluminescence', 'Neon Glow', 'Golden Hour', 'Unreal Engine 5', 'Octane Render', 'Ray Tracing']
    },
    {
      category: 'Mood/Tone',
      options: ['Dark Fantasy', 'Whimsical', 'Ethereal', 'Gritty/Noir', 'Utopian', 'Surreal', 'Liminal Space']
    }
  ],
  Text: [
    {
      category: 'Roles & Personas',
      options: ['Software Architect', 'Data Scientist', 'Marketing Strategist', 'Legal Advisor', 'Creative Novelist', 'UX Researcher', 'Financial Analyst']
    },
    {
      category: 'Frameworks & Theories',
      options: ['SOLID Principles', 'Hero\'s Journey', 'AIDA Marketing', 'First Principles Thinking', 'Design Thinking', 'Agile/Scrum', 'Socratic Method']
    },
    {
      category: 'Output Formats',
      options: ['JSON Object', 'Mermaid Diagram', 'Markdown Table', 'LaTeX Math', 'Step-by-Step Guide', 'SWOT Analysis', 'React Component']
    },
    {
      category: 'Voice & Tone',
      options: ['Academic/Rigorous', 'Witty & Sarcastic', 'Empathic & Warm', 'Concise/Executive', 'Persuasive', 'Satirical']
    }
  ],
  Agent: [
    {
      category: 'Context Handling',
      options: ['Strict Adherence (No external info)', 'Summarize Before Answering', 'Extract Entities Only', 'Step-by-Step Reasoning (Chain of Thought)', 'Cite Document Sources']
    },
    {
      category: 'Agent Personas',
      options: ['Helpful Enterprise Assistant', 'Strict Content Moderator', 'Expert Data Analyst', 'Code Review & Security Bot', 'Level 1 Customer Support']
    },
    {
      category: 'Guardrails & Safety',
      options: ['Refuse Off-Topic Queries', 'No Conversational Filler', 'Polite Decline', 'Prevent Prompt Injection', 'Data Masking / PII Redaction']
    },
    {
      category: 'Output Formats',
      options: ['Strict JSON Object', 'Markdown Document', 'XML Data Tags', 'Thought/Action/Observation (ReAct)', 'Concise Bullet Points']
    }
  ]
};

const CATEGORIES = ['Coding', 'Writing & Content', 'Image Generation', 'Video Generation', 'Research & Data', 'RAG / AI Agent'];

const RANDOM_IDEAS = {
  Visual: ["A samurai frog", "A floating city in the clouds", "A cute robot planting a tree", "A neon-lit noodle shop", "A dragon drinking tea"],
  Text: ["Write a cold email to a CEO", "Explain quantum physics to a 5-year old", "Write a python script for web scraping", "Create a marketing plan for energy drinks", "Write a short sci-fi story about a rogue AI"],
  Agent: ["A RAG bot for internal HR policies", "An agent that scrapes and summarizes tech news", "A strictly-typed JSON extractor for medical invoices", "A customer support bot that refuses to talk about politics", "A database expert that converts natural language to SQL"]
};

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? <span key={i} style={{ fontWeight: 800, color: 'var(--accent)' }}>{part}</span> : part
  );
}

function App() {
  const [apiKey, setApiKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'google' | 'openrouter' | 'groq'>('google');
  const [openRouterModel, setOpenRouterModel] = useState('openrouter/free');
  const [showSettings, setShowSettings] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Category State
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  // File Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'document' | null>(null);

  // External Skills State
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapedContext, setScrapedContext] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [trendingContext, setTrendingContext] = useState<string[]>([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);

  // Advanced State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [targetPlatform, setTargetPlatform] = useState<'Any' | 'ChatGPT' | 'Claude' | 'Gemini'>('Any');
  const [selectedFramework, setSelectedFramework] = useState('auto');
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptTester, setShowPromptTester] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userToken, setUserToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [pin, setPin] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pinError, setPinError] = useState('');
  const [serverKeysAvailable, setServerKeysAvailable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('prompt_crafter_gemini_key');
    const savedOrKey = localStorage.getItem('prompt_crafter_or_key');
    const savedGroqKey = localStorage.getItem('prompt_crafter_groq_key');
    const savedProvider = localStorage.getItem('prompt_crafter_provider') as any;
    const token = localStorage.getItem('prompt_crafter_token');
    const email = localStorage.getItem('prompt_crafter_email');
    
    if (savedProvider) setApiProvider(savedProvider);
    if (token) setUserToken(token);
    if (email) setUserEmail(email);

    if (savedKey || savedOrKey || savedGroqKey) {
      setIsLocked(true); // Keys exist, prompt for PIN
    } else {
      setShowSettings(true); // No keys, show settings
    }

    const checkSharedPrompt = async () => {
      if (window.location.hash.startsWith('#share=')) {
        const shareId = window.location.hash.replace('#share=', '');
        try {
          const res = await fetch(`/api/share?id=${shareId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.promptData) {
              setGeneratedPrompt(data.promptData);
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        } catch (e) {
          console.error("Failed to fetch shared prompt", e);
        }
      }
    };
    checkSharedPrompt();

    const loadHistory = async (currentToken: string) => {
      if (currentToken) {
        setIsSyncing(true);
        try {
          const res = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.history) {
              setHistory(data.history);
              localStorage.setItem('prompt_crafter_history', JSON.stringify(data.history));
              setIsSyncing(false);
              return;
            }
          } else if (res.status === 401) {
            handleLogout(); // Token expired or invalid
          }
        } catch (e) {
          console.error("Cloud sync failed on load", e);
        }
        setIsSyncing(false);
      }
      
      const savedHistory = localStorage.getItem('prompt_crafter_history');
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
    };
    
    loadHistory(token || '');

    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        const sk = data.serverKeys;
        if (sk && (sk.gemini || sk.groq || sk.openrouter)) {
          setServerKeysAvailable(true);
        }
      })
      .catch(() => {});
  }, []);

  const saveApiKey = async (key: string) => {
    let finalKey = key;
    if (pin && key) {
      try {
        finalKey = await encryptData(key, pin);
      } catch (e) {
        console.error("Encryption failed", e);
      }
    }

    if (apiProvider === 'google') {
      setApiKey(key);
      localStorage.setItem('prompt_crafter_gemini_key', finalKey);
    } else if (apiProvider === 'openrouter') {
      setOpenRouterKey(key);
      localStorage.setItem('prompt_crafter_or_key', finalKey);
    } else {
      setGroqKey(key);
      localStorage.setItem('prompt_crafter_groq_key', finalKey);
    }
  };

  const handleUnlock = async () => {
    try {
      const savedKey = localStorage.getItem('prompt_crafter_gemini_key');
      const savedOrKey = localStorage.getItem('prompt_crafter_or_key');
      const savedGroqKey = localStorage.getItem('prompt_crafter_groq_key');

      if (savedKey) setApiKey(await decryptData(savedKey, pin));
      if (savedOrKey) setOpenRouterKey(await decryptData(savedOrKey, pin));
      if (savedGroqKey) setGroqKey(await decryptData(savedGroqKey, pin));
      setIsLocked(false);
      setPinError('');
    } catch (e) {
      setPinError('Incorrect PIN or corrupted data.');
    }
  };

  const handleAuthSuccess = async (token: string, email: string) => {
    setUserToken(token);
    setUserEmail(email);
    localStorage.setItem('prompt_crafter_token', token);
    localStorage.setItem('prompt_crafter_email', email);
    setShowAuthModal(false);

    setIsSyncing(true);
    try {
      const res = await fetch('/api/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setHistory(data.history);
          localStorage.setItem('prompt_crafter_history', JSON.stringify(data.history));
        } else {
          await fetch('/api/history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ history }),
          });
        }
      }
    } catch (e) {
      console.error('Sync after login failed', e);
    }
    setIsSyncing(false);
  };

  const handleLogout = () => {
    setUserToken('');
    setUserEmail('');
    localStorage.removeItem('prompt_crafter_token');
    localStorage.removeItem('prompt_crafter_email');
  };

  const authHeaders = (): Record<string, string> =>
    userToken ? { Authorization: `Bearer ${userToken}` } : {};

  const handleProviderChange = (provider: 'google' | 'openrouter' | 'groq') => {
    setApiProvider(provider);
    localStorage.setItem('prompt_crafter_provider', provider);
  };

  const handleModelChange = (model: string) => {
    setOpenRouterModel(model);
    localStorage.setItem('openrouter_model', model);
  };

  useEffect(() => {
    if (!inputPrompt.trim()) {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setIsPredicting(false);
      return;
    }
    
    const query = inputPrompt.toLowerCase();
    let matches: string[] = [];
    
    const activeKey = Object.keys(SUGGESTIONS).find(k => k.includes(activeCategory) || activeCategory.includes(k));
    
    if (activeKey) {
      const categorySuggestions = SUGGESTIONS[activeKey];
      matches = categorySuggestions.filter(s => 
        s.toLowerCase().includes(query) && s.toLowerCase() !== query
      );
    }
    
    if (matches.length < 5) {
      const otherSuggestions = Object.entries(SUGGESTIONS)
        .filter(([key]) => key !== activeKey)
        .flatMap(([, items]) => items);
        
      const additionalMatches = otherSuggestions.filter(s => 
        s.toLowerCase().includes(query) && s.toLowerCase() !== query
      );
      
      matches = [...matches, ...additionalMatches];
    }
    
    matches = Array.from(new Set(matches)).slice(0, 5);
    
    // If we have static matches, show them immediately
    if (matches.length > 0) {
      setAutocompleteSuggestions(matches);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
      setIsPredicting(false);
      return;
    }

    // If no static matches and query is long enough, try AI prediction
    if (query.length > 3) {
      setIsPredicting(true);
      setShowSuggestions(true);
      setAutocompleteSuggestions([]);
      
      const timer = setTimeout(async () => {
        try {
          const sysPrompt = `You are an AI Co-Pilot for a prompt generator. The user is in the '${activeCategory}' category. They typed: '${inputPrompt}'. Generate 3 highly creative, out-of-the-box, lateral-thinking ways to finish their thought. Don't just finish the sentence predictably; give them an incredible idea they haven't thought of. 

CRITICAL: Reply ONLY with a valid JSON array of 3 strings. Do not include markdown formatting, code blocks, or any other text. 
Example: ["Develop a python script that uses ML to predict the stock market", "Create a react component with a 3D WebGL particle system", "Build a mobile app for tracking lucid dreams"]`;
          
          let aiResponse = '';
          let rawResponseData: any = null;

          if ((apiProvider === 'google' && !apiKey) || 
              (apiProvider === 'groq' && !groqKey) || 
              (apiProvider === 'openrouter' && !openRouterKey)) {
            setAutocompleteSuggestions(['⚠️ Please set your API key in Settings to enable AI Co-Pilot']);
            setShowSuggestions(true);
            setIsPredicting(false);
            return;
          }

          const res = await fetch('/api/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              provider: apiProvider,
              geminiKey: apiKey,
              groqKey: groqKey,
              openRouterKey: openRouterKey,
              sysPrompt
            })
          });
          const data = await res.json();
          rawResponseData = data.debug;
          
          if (data.error) {
            setAutocompleteSuggestions([`⚠️ Backend Error: ${data.error}`]);
            setShowSuggestions(true);
            setIsPredicting(false);
            return;
          }
          
          aiResponse = data.result || '';

          if (aiResponse) {
            try {
              // Robust JSON array extraction
              const jsonMatch = aiResponse.match(/\[.*\]/s);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setAutocompleteSuggestions(parsed.slice(0, 3));
                  setShowSuggestions(true);
                } else {
                  setAutocompleteSuggestions(['⚠️ AI was unable to generate suggestions. Try typing more.']);
                  setShowSuggestions(true);
                }
              } else {
                console.error("No JSON array found in AI response:", aiResponse);
                setAutocompleteSuggestions(['⚠️ AI returned a non-JSON response.']);
                setShowSuggestions(true);
              }
            } catch (e) {
              console.error("Failed to parse AI autocomplete:", e, "Raw:", aiResponse);
              setAutocompleteSuggestions(['⚠️ AI returned an invalid response format.']);
              setShowSuggestions(true);
            }
          } else {
            setAutocompleteSuggestions([`⚠️ Empty Response. Debug: ${JSON.stringify(rawResponseData || 'No data').substring(0, 80)}`]);
            setShowSuggestions(true);
          }
        } catch (e) {
          console.error("AI Prediction Error:", e);
          setAutocompleteSuggestions(['⚠️ Connection Error: Could not reach AI provider.']);
          setShowSuggestions(true);
        } finally {
          setIsPredicting(false);
        }
      }, 1200); // 1200ms debounce to protect rate limits
      
      return () => clearTimeout(timer);
    } else {
      setShowSuggestions(false);
      setIsPredicting(false);
    }
    
  }, [inputPrompt, activeCategory, apiProvider, apiKey, groqKey, openRouterKey, openRouterModel]);

  const saveHistory = async (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('prompt_crafter_history', JSON.stringify(newHistory));
    
    if (userToken) {
      setIsSyncing(true);
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({ history: newHistory })
        });
      } catch (e) {
        console.error("Failed to push history to cloud", e);
      }
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    
    const headers = ["ID", "Idea", "Full Prompt", "Date"];
    const rows = history.map(item => [
      item.id,
      `"${item.shortIdea.replace(/"/g, '""')}"`,
      `"${item.fullPrompt.replace(/"/g, '""')}"`,
      new Date(item.timestamp).toISOString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "promptcrafter_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSharePrompt = async (prompt: string) => {
    setIsSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptData: prompt })
      });
      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${window.location.origin}/#share=${data.shareId}`;
        await navigator.clipboard.writeText(shareUrl);
        alert(`Share link copied to clipboard!\n${shareUrl}`);
      } else {
        alert("Failed to generate share link.");
      }
    } catch (e) {
      console.error("Share failed", e);
      alert("Failed to share prompt.");
    }
    setIsSharing(false);
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleCategoryChange = (cat: string) => {
    if (cat !== activeCategory) {
      const wasVisual = activeCategory.includes('Image') || activeCategory.includes('Video');
      const isVisual = cat.includes('Image') || cat.includes('Video');
      const wasAgent = activeCategory.includes('Agent');
      const isAgent = cat.includes('Agent');

      if (wasVisual !== isVisual || wasAgent !== isAgent) {
        setSelectedStyles([]);
      }
      setActiveCategory(cat);
      if (selectedFramework === 'auto') {
        setSelectedFramework(getRecommendedFramework(cat).id);
      }
    }
  };

  const isVisualCategory = activeCategory.includes('Image') || activeCategory.includes('Video');
  const isAgentCategory = activeCategory.includes('Agent');
  
  const currentStyleData = isVisualCategory 
    ? STYLE_CATEGORIES.Visual 
    : isAgentCategory 
      ? STYLE_CATEGORIES.Agent 
      : STYLE_CATEGORIES.Text;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (file.type.startsWith('image/')) {
        setFileType('image');
        setImagePreview(URL.createObjectURL(file));
      } else {
        setFileType('document');
        setImagePreview(null);
      }
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    setScrapedContext('');
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(scrapeUrl)}`);
      const data = await res.json();
      if (data.contents) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
        const text = doc.body.innerText.replace(/\s+/g, ' ').trim();
        setScrapedContext(text.substring(0, 5000));
      }
    } catch (e) {
      console.error(e);
      alert('Failed to scrape URL.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleFetchNews = async () => {
    setIsFetchingNews(true);
    setTrendingContext([]);
    try {
      const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const storyIds = await res.json();
      const top5Ids = storyIds.slice(0, 5);
      const stories = await Promise.all(
        top5Ids.map((id: number) => 
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
        )
      );
      setTrendingContext(stories.map(s => s.title));
    } catch (e) {
      console.error(e);
      alert('Failed to fetch news.');
    } finally {
      setIsFetchingNews(false);
    }
  };

  const executeGeneration = async (promptText: string, stylesToUse: string[], retryCount = 0) => {
    const hasClientKey =
      (apiProvider === 'google' && apiKey) ||
      (apiProvider === 'openrouter' && openRouterKey) ||
      (apiProvider === 'groq' && groqKey);

    if (!hasClientKey && retryCount === 0) {
      // Server-side keys may be configured — attempt anyway
      console.info('No client API key; trying server-side keys if configured.');
    }
    if (!promptText.trim() && !imageFile && !scrapedContext && trendingContext.length === 0) return;

    setGeneratedPrompt('');
    if (retryCount === 0) {
      setIsLoading(true);
    }

    try {
      let categoryInstruction = '';
      if (activeCategory === 'Coding') {
        categoryInstruction = 'Format the prompt specifically for generating robust, production-ready code. Emphasize tech stack, edge cases, error handling, performance constraints, and clear structural requirements.';
      } else if (activeCategory === 'Writing & Content') {
        categoryInstruction = 'Format the prompt specifically for high-quality writing and content creation. Emphasize tone of voice, target audience, structural formatting (headings, bullet points), and emotional resonance.';
      } else if (activeCategory === 'Image Generation') {
        categoryInstruction = 'Format the prompt specifically for AI Image generation models (Midjourney, Stable Diffusion), emphasizing visual details, composition, lighting, style modifiers, and medium.';
      } else if (activeCategory === 'Video Generation') {
        categoryInstruction = 'Format the prompt specifically for AI Video generation models (like Runway, Sora), emphasizing motion, camera movements (panning, tracking), lighting dynamics, and cinematic pacing.';
      } else if (activeCategory === 'Research & Data') {
        categoryInstruction = 'Format the prompt specifically for deep research and data analysis. Emphasize analytical rigor, citation formatting, step-by-step reasoning, and structured data outputs (tables, JSON).';
      } else if (activeCategory === 'RAG / AI Agent') {
        categoryInstruction = 'Format the output as a highly robust System Prompt designed for an autonomous AI Agent or RAG (Retrieval-Augmented Generation) pipeline. It must include sections for [Role/Persona], [Core Directives], [Context Handling Instructions (how to use {context})], [Guardrails/Safety Rules], and [Output Format/Schema].';
      }

      let platformInstruction = '';
      if (targetPlatform === 'ChatGPT') {
        platformInstruction = 'Format the prompt specifically for ChatGPT, emphasizing persona, step-by-step reasoning instructions, strict constraints, and markdown formatting.';
      } else if (targetPlatform === 'Claude') {
        platformInstruction = 'Format the prompt specifically for Anthropic Claude, utilizing XML tags (<system>, <instruction>, etc.) for clear structural separation of context, guidelines, and desired output.';
      } else if (targetPlatform === 'Gemini') {
        platformInstruction = 'Format the prompt specifically for Google Gemini, focusing on deep contextual grounding, clear few-shot examples if necessary, and highly descriptive multidimensional logic.';
      }

      const stylesInstruction = stylesToUse.length > 0 
        ? `Incorporate the following styles/tones into the prompt: ${stylesToUse.join(', ')}.`
        : '';

      let extraContext = '';
      if (scrapedContext) {
        extraContext += `\n\nWEB CONTEXT (Incorporate this information):\n${scrapedContext}`;
      }
      if (trendingContext.length > 0) {
        extraContext += `\n\nTRENDING NEWS CONTEXT (Incorporate these current events into the prompt):\n${trendingContext.map((t, i) => `${i+1}. ${t}`).join('\n')}`;
      }

      const frameworkId = selectedFramework === 'auto'
        ? getRecommendedFramework(activeCategory).id
        : selectedFramework;
      const frameworkPreamble = buildFrameworkSystemPreamble(frameworkId, activeCategory);

      const systemInstruction = `You are a legendary, world-class prompt engineer and domain expert.
Your task is to take a simple, short sentence (and optionally an image reference, document, or web context) and transform it into an incredibly detailed, highly specific, and creative prompt.

${frameworkPreamble}

CRITICAL INSTRUCTION: Analyze the core topic of the user's input and automatically inject deep domain knowledge, expert terminology, industry best practices, and advanced creative frameworks into the final prompt to elevate it from a basic request to a masterclass prompt.
${categoryInstruction}
${platformInstruction}
${stylesInstruction}
${extraContext}
If an image or document is provided, use its contents to inspire and flesh out the specific details.
Do not include any pleasantries or conversational filler. Output ONLY the generated prompt — every framework section must be filled with real, topic-specific content.`;

        let imageBase64 = '';
        let mimeType = '';
        
        if (imageFile) {
          if (apiProvider !== 'google') {
             throw new Error("Image uploads are only supported when using Google Gemini.");
          }
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const b64 = (reader.result as string).split(',')[1];
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          mimeType = imageFile.type;
        }

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            provider: apiProvider,
            geminiKey: apiKey,
            groqKey: groqKey,
            openRouterKey: openRouterKey,
            systemInstruction,
            promptText,
            imageBase64,
            mimeType,
            model: openRouterModel,
            frameworkId,
          }),
        });

        const data = await res.json();
        
        if (!res.ok) {
           throw new Error(data.error || 'Failed to generate prompt via backend.');
        }

        let resultText = data.result || 'Failed to generate prompt.';

      setGeneratedPrompt(resultText);

      if (retryCount === 0) {
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          shortIdea: promptText || 'From Context/Upload',
          fullPrompt: resultText,
          timestamp: Date.now(),
        };
        saveHistory([newHistoryItem, ...history].slice(0, 100));
      }
      setIsLoading(false);

    } catch (error: any) {
      console.error(error);
      let errMsg = error.message || String(error);
      try {
        if (errMsg.startsWith('{')) {
          const parsed = JSON.parse(errMsg);
          if (parsed.error && parsed.error.message) errMsg = parsed.error.message;
        }
      } catch(e) {}
      
      let isTempError = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429') || errMsg.includes('quota');
      
      if (isTempError) {
        let waitMs = 60000; // Default 60s cooldown
        
        const retryMatch = errMsg.match(/retry in ([\d\.]+)(m?s)/);
        if (retryMatch && retryMatch[1]) {
          const val = parseFloat(retryMatch[1]);
          if (retryMatch[2] === 'ms') {
            waitMs = Math.ceil(val) + 2000; // 2 sec buffer
          } else {
            waitMs = Math.ceil(val * 1000) + 2000; // 2 sec buffer
          }
        }

        const targetTimeMs = Date.now() + waitMs;
        let initialSeconds = Math.ceil(waitMs / 1000);
        setGeneratedPrompt(`⏳ Waiting ${initialSeconds}s... (Reason: ${errMsg})`);
        
        const countdownInterval = setInterval(() => {
          const remainingSeconds = Math.ceil((targetTimeMs - Date.now()) / 1000);
          if (remainingSeconds > 0) {
            setGeneratedPrompt(`⏳ Waiting ${remainingSeconds}s... (Reason: ${errMsg})`);
          } else {
            clearInterval(countdownInterval);
            setGeneratedPrompt('✨ Cooldown finished! You can click Generate Prompt again.');
            setIsLoading(false); // Re-enable the button
          }
        }, 1000);

      } else {
        setGeneratedPrompt(`Error: ${errMsg}`);
        setIsLoading(false);
      }
    }
  };

  const generatePrompt = () => {
    executeGeneration(inputPrompt, selectedStyles);
  };

  const handleSurpriseMe = () => {
    const allOptions = currentStyleData.flatMap(group => group.options);
    const randomStyles: string[] = [];
    while (randomStyles.length < 2) {
      const rand = allOptions[Math.floor(Math.random() * allOptions.length)];
      if (!randomStyles.includes(rand)) randomStyles.push(rand);
    }
    setSelectedStyles(randomStyles);

    let promptToUse = inputPrompt;
    if (!promptToUse.trim()) {
      const ideasList = isVisualCategory 
        ? RANDOM_IDEAS.Visual 
        : isAgentCategory 
          ? RANDOM_IDEAS.Agent 
          : RANDOM_IDEAS.Text;
      promptToUse = ideasList[Math.floor(Math.random() * ideasList.length)];
      setInputPrompt(promptToUse);
    }

    executeGeneration(promptToUse, randomStyles);
  };

  const handleClearSession = () => {
    setInputPrompt('');
    setGeneratedPrompt('');
    setScrapeUrl('');
    setScrapedContext('');
    setTrendingContext([]);
    clearImage();
    setSelectedStyles([]);
    setShowSettings(false);
    setShowHistory(false);
    setShowAdvanced(false);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteHistoryItem = (id: string) => {
    saveHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="app-container">
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      
      <header className="header">
        <h1 
          className="title" 
          onClick={handleClearSession} 
          style={{ cursor: 'pointer' }} 
          title="Reset to Home"
        >
          PromptCrafter
        </h1>
        <p className="subtitle">Turn a simple 5-word sentence into a legendary prompt</p>
      </header>

      <div className="main-layout">
        <div className="glass-panel main-panel">
          {!(showSettings || showHistory) && (
            <div className="panel-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', paddingBottom: 0 }}>
              <div className="header-actions">
                {userToken ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} color="#10b981" />} 
                      {userEmail}
                    </span>
                    <button className="icon-btn" onClick={handleLogout} title="Sign Out" style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#ef4444' }}>
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <button className="icon-btn" onClick={() => setShowAuthModal(true)} title="Sign In" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
                    <UserCircle size={20} />
                  </button>
                )}
                <button className="icon-btn" onClick={() => setShowHistory(true)} title="History" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
                  <HistoryIcon size={20} />
                </button>
                <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
                  <Settings size={20} />
                </button>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="settings-panel">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                <button 
                  onClick={() => setShowSettings(false)}
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  <ArrowLeft size={18} />
                  Back to Dashboard
                </button>
              </div>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>API Provider</label>
                <select 
                  value={apiProvider}
                  onChange={(e) => handleProviderChange(e.target.value as 'google' | 'openrouter' | 'groq')}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    background: '#f9fafb',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="google">Google Gemini (Official)</option>
                  <option value="openrouter">OpenRouter (Free Bypass)</option>
                  <option value="groq">Groq (Ultra-Fast Free)</option>
                </select>
              </div>

              {apiProvider === 'openrouter' && (
                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <label>OpenRouter Free Model</label>
                  <select 
                    value={openRouterModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      background: '#f9fafb',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="openrouter/free">OpenRouter Auto (Free)</option>
                    <option value="google/gemini-pro">Gemini Pro 1.5</option>
                    <option value="meta-llama/llama-3-8b-instruct">Llama 3 8B</option>
                  </select>
                </div>
              )}

              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>4-Digit PIN (Required for encryption)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="password" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="Enter 4-digit PIN"
                    style={{
                      width: '120px',
                      padding: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      background: '#f9fafb',
                      fontSize: '1.2rem',
                      textAlign: 'center',
                      letterSpacing: '0.5em'
                    }}
                    maxLength={4}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Lock size={14} style={{ marginRight: '4px' }} /> Your keys are AES-GCM encrypted in local storage using this PIN.
                  </span>
                </div>
              </div>

              <div className="input-group">
                <label>API Key ({apiProvider === 'google' ? 'Google AI Studio' : apiProvider === 'openrouter' ? 'OpenRouter' : 'Groq'})</label>
                {serverKeysAvailable && (
                  <p style={{ fontSize: '0.8rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                    ✓ Server API keys configured — you can generate without entering your own key.
                  </p>
                )}
                <input 
                  type="password" 
                  value={apiProvider === 'google' ? apiKey : apiProvider === 'openrouter' ? openRouterKey : groqKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder={`Enter your ${apiProvider} API Key`}
                  disabled={(!pin || pin.length < 4) && !serverKeysAvailable}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--panel-border)',
                    background: ((!pin || pin.length < 4) && !serverKeysAvailable) ? '#e5e7eb' : '#f9fafb',
                    fontSize: '0.9rem'
                  }}
                />
                {apiProvider === 'openrouter' && (
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Get your free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>openrouter.ai/keys</a>. Note: Image uploads are disabled on free OpenRouter models.
                  </p>
                )}
                {apiProvider === 'groq' && (
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Get your free ultra-fast key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.groq.com/keys</a>.
                  </p>
                )}
              </div>
            </div>
          )}

          {showHistory && (
            <div className="history-panel fade-in">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                <button 
                  onClick={() => setShowHistory(false)}
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                >
                  <ArrowLeft size={18} />
                  Back to Dashboard
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Prompt History</h3>
                <button className="generate-btn" onClick={handleExportCSV} disabled={history.length === 0} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
              {history.length === 0 ? (
                <p className="empty-history">No prompts generated yet.</p>
              ) : (
                <div className="history-list">
                  {history.map(item => (
                    <div key={item.id} className="history-item" style={{ padding: '1rem', border: '1px solid var(--panel-border)', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span className="history-idea" style={{ fontWeight: 600, color: 'var(--text-main)', paddingRight: '1rem' }}>{item.shortIdea}</span>
                        <button className="delete-history-btn" onClick={() => deleteHistoryItem(item.id)} style={{ flexShrink: 0, padding: '0.2rem', cursor: 'pointer', background: 'transparent', border: 'none', color: '#ef4444' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div 
                        className="history-prompt" 
                        onClick={() => setSelectedHistoryItem(item)}
                        style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        title="Click to view full prompt"
                      >
                        {item.fullPrompt}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="history-copy-btn" onClick={() => handleSharePrompt(item.fullPrompt)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Share2 size={12} /> Share
                        </button>
                        <button className="history-copy-btn" onClick={() => copyToClipboard(item.fullPrompt)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(!showSettings && !showHistory) && (
            <>
            <div className="editor-container" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>What do you want to create?</label>
                    <select 
                      value={activeCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--panel-border)',
                        background: '#f9fafb',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        outline: 'none',
                        fontWeight: 500
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <textarea 
                    value={inputPrompt}
                    onChange={(e) => {
                      setInputPrompt(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = (e.target.scrollHeight) + 'px';
                    }}
                    placeholder={`e.g. ${isVisualCategory ? "A neon-lit futuristic city" : isAgentCategory ? "A customer support bot that checks inventory" : "Explain React hooks to a beginner"}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        generatePrompt();
                        return;
                      }
                      
                      if (showSuggestions && autocompleteSuggestions.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev => 
                            prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                          if (selectedSuggestionIndex >= 0) {
                            e.preventDefault();
                            setInputPrompt(autocompleteSuggestions[selectedSuggestionIndex]);
                            setShowSuggestions(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    style={{ 
                      padding: '1.2rem', 
                      fontSize: '1.1rem', 
                      width: '100%', 
                      flex: 1,
                      borderRadius: '12px', 
                      border: '1px solid var(--panel-border)', 
                      background: '#ffffff',
                      resize: 'none',
                      minHeight: '120px',
                      maxHeight: '300px',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Press Cmd/Ctrl + Enter to generate
                    </div>
                  </div>
                </div>
                
                <div className="suggestions-side-panel" style={{ flex: '1 1 250px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--panel-border)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Sparkles size={14} color="var(--accent)" /> AI Co-Pilot Suggestions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {isPredicting ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.95rem', padding: '1rem', justifyContent: 'center', height: '100%' }}>
                        <Loader2 size={18} className="spin" color="var(--accent)" />
                        Thinking...
                      </div>
                    ) : showSuggestions && autocompleteSuggestions.length > 0 ? (
                      autocompleteSuggestions.map((suggestion, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setInputPrompt(suggestion);
                            setShowSuggestions(false);
                          }}
                          style={{
                            padding: '0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: idx === selectedSuggestionIndex ? 'var(--accent)' : 'var(--panel-border)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            background: idx === selectedSuggestionIndex ? '#ffffff' : 'transparent',
                            boxShadow: idx === selectedSuggestionIndex ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                          }}
                          onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                          onMouseLeave={() => setSelectedSuggestionIndex(-1)}
                        >
                          <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '0.1rem' }}>✦</span>
                          <span style={{ lineHeight: 1.4 }}>
                            {highlightMatch(suggestion, inputPrompt)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic', height: '100%', textAlign: 'center', padding: '1rem' }}>
                        Start typing keywords in the box to see AI predictions...
                      </div>
                    )}
                  </div>
                </div>
              </div>

          <div className="button-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center' }}>
            <button 
              className="generate-btn" 
              onClick={generatePrompt}
              disabled={isLoading || (!inputPrompt.trim() && !imageFile && !scrapedContext && trendingContext.length === 0)}
              style={{ flex: 1, padding: '1rem', fontSize: '1.05rem', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Generate Prompt
            </button>
            
            <button 
              className="generate-btn surprise-btn" 
              onClick={handleSurpriseMe}
              disabled={isLoading}
              style={{ padding: '1rem', background: '#f1f5f9', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}
              title="Surprise Me (Random Idea)"
            >
              <Dices size={20} />
            </button>

            <button 
              className="generate-btn surprise-btn" 
              onClick={handleClearSession}
              disabled={isLoading || (!inputPrompt && !generatedPrompt && !imageFile && selectedStyles.length === 0 && !scrapedContext && trendingContext.length === 0)}
              style={{ padding: '1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)' }}
              title="Erase and Start Over"
            >
              <Eraser size={20} />
            </button>
          </div>

          <div className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            <span className="advanced-divider"></span>
            <span className="advanced-label">
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
            <span className="advanced-divider"></span>
          </div>

          {showAdvanced && (
            <div className="advanced-panel fade-in">
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Prompt Framework</label>
                <select
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value)}
                  className="style-dropdown"
                >
                  <option value="auto">Auto (best for category)</option>
                  {PROMPT_FRAMEWORKS.map((fw) => (
                    <option key={fw.id} value={fw.id}>
                      {fw.name} — {fw.acronym.split(' · ').slice(0, 3).join(' · ')}…
                    </option>
                  ))}
                </select>
                {(() => {
                  const fw = selectedFramework === 'auto'
                    ? getRecommendedFramework(activeCategory)
                    : PROMPT_FRAMEWORKS.find((f) => f.id === selectedFramework);
                  return fw ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {fw.description} Sections: {fw.sections.map((s) => s.label).join(', ')}.
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>Target LLM Platform</label>
                <select 
                  value={targetPlatform}
                  onChange={(e) => setTargetPlatform(e.target.value as any)}
                  className="style-dropdown"
                >
                  <option value="Any">Any / Agnostic</option>
                  <option value="ChatGPT">ChatGPT</option>
                  <option value="Claude">Anthropic Claude</option>
                  <option value="Gemini">Google Gemini</option>
                </select>
              </div>

              <div className="input-group">
                <label>{isVisualCategory ? 'Aesthetics & Modifiers' : isAgentCategory ? 'Agent Behaviors & Rules' : 'Occupations & Roles'}</label>
                <select 
                  className="style-dropdown"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedStyles.includes(val)) {
                      toggleStyle(val);
                    }
                    e.target.value = ''; // reset dropdown
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select to add...</option>
                  {currentStyleData.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                
                {selectedStyles.length > 0 && (
                  <div className="styles-container" style={{ marginTop: '0.5rem' }}>
                    {selectedStyles.map(style => (
                      <button
                        key={style}
                        className="style-pill active"
                        onClick={() => toggleStyle(style)}
                        title="Click to remove"
                      >
                        {style} <X size={12} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="external-context-section" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
                  <Globe size={18} /> External Context Skills
                </label>
                
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem' }}>🌐 Web Scraper (URL Context)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Paste a URL to scrape text from..." 
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      style={{ flex: 1, padding: '0.75rem' }}
                    />
                    <button 
                      className="generate-btn surprise-btn" 
                      onClick={handleScrapeUrl}
                      disabled={isScraping || !scrapeUrl}
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      {isScraping ? <Loader2 size={16} className="animate-spin" /> : 'Scrape'}
                    </button>
                  </div>
                  {scrapedContext && <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>✓ Scraped {scrapedContext.length} characters of context</span>}
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem' }}>🔥 Real-Time Injection</label>
                  <button 
                    className="generate-btn surprise-btn" 
                    onClick={handleFetchNews}
                    disabled={isFetchingNews}
                    style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
                  >
                    {isFetchingNews ? <Loader2 size={16} className="animate-spin" /> : <><Flame size={16}/> Fetch Trending Tech News</>}
                  </button>
                  {trendingContext.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.5rem' }}>
                      ✓ Fetched: {trendingContext[0]}... and {trendingContext.length - 1} more.
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.85rem' }}>📄 Upload Document or Image (PDF, TXT, MD, Image)</label>
                  <div className="image-upload-area" style={{ marginTop: 0 }}>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf,text/plain,text/markdown"
                      onChange={handleImageChange}
                      ref={fileInputRef}
                      id="image-upload"
                      className="hidden-input"
                    />
                    {!fileType ? (
                      <label htmlFor="image-upload" className="upload-placeholder" style={{ padding: '1rem', background: '#ffffff' }}>
                        <FileText size={24} />
                        <span>Click to attach a file</span>
                      </label>
                    ) : (
                      <div className="image-preview-container">
                        {fileType === 'image' && imagePreview ? (
                          <img src={imagePreview} alt="Context preview" className="image-preview" />
                        ) : (
                          <div className="document-preview">
                            <span className="document-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                              <FileText size={18} /> {imageFile?.name}
                            </span>
                          </div>
                        )}
                        <button className="clear-image-btn" onClick={clearImage} title="Remove file">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(generatedPrompt || isLoading) && (
            <div className="output-box fade-in">
              <div className="output-content">
                {(isLoading && !generatedPrompt.includes('⏳')) ? 'Crafting your legendary prompt...' : generatedPrompt}
              </div>
              {!isLoading && generatedPrompt && !generatedPrompt.includes('⏳') && (
                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end', marginTop: '1rem' }}>
                  <button className="copy-btn" onClick={() => handleSharePrompt(generatedPrompt)} disabled={isSharing} title="Share via Link" style={{ display: 'flex', gap: '0.5rem', width: 'auto', padding: '0.5rem 1rem' }}>
                    {isSharing ? <Loader2 size={16} className="animate-spin" /> : <><Share2 size={16} /> Share</>}
                  </button>
                  <button className="copy-btn" onClick={() => setShowPromptTester(true)} title="Test this prompt live" style={{ display: 'flex', gap: '0.5rem', width: 'auto', padding: '0.5rem 1rem' }}>
                    <MessageSquare size={16} /> Test Prompt
                  </button>
                  <button className="copy-btn" onClick={() => copyToClipboard(generatedPrompt)} title="Copy to clipboard">
                    {copied ? <Check size={18} color="#4ade80" /> : <Copy size={18} />}
                  </button>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

      </div>

      {selectedHistoryItem && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryItem(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedHistoryItem.shortIdea}</h2>
              <button className="icon-btn" onClick={() => setSelectedHistoryItem(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {selectedHistoryItem.fullPrompt}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="generate-btn" onClick={() => { 
                setGeneratedPrompt(selectedHistoryItem.fullPrompt);
                setShowPromptTester(true);
                setSelectedHistoryItem(null); 
              }} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>
                <MessageSquare size={16} /> Test
              </button>
              <button className="generate-btn" onClick={() => { copyToClipboard(selectedHistoryItem.fullPrompt); setSelectedHistoryItem(null); }}>
                <Copy size={16} /> Copy Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {isLocked && (
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <Lock size={48} style={{ color: 'var(--accent)', margin: '0 auto', display: 'block' }} />
              <h2 style={{ marginTop: '1rem' }}>App Locked</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter your 4-digit PIN to decrypt your API keys.</p>
            </div>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="••••"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--panel-border)',
                fontSize: '2rem',
                textAlign: 'center',
                letterSpacing: '0.5em',
                marginBottom: '1rem'
              }}
              autoFocus
            />
            {pinError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{pinError}</p>}
            <button 
              className="generate-btn surprise-btn"
              onClick={handleUnlock}
              disabled={pin.length !== 4}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Unlock size={18} style={{ marginRight: '0.5rem' }} /> Unlock
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('prompt_crafter_gemini_key');
                localStorage.removeItem('prompt_crafter_or_key');
                localStorage.removeItem('prompt_crafter_groq_key');
                setIsLocked(false);
                setPin('');
                setShowSettings(true);
              }}
              style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
            >
              Reset Keys
            </button>
          </div>
        </div>
      )}

      {showPromptTester && generatedPrompt && (
        <PromptTester 
          systemPrompt={generatedPrompt} 
          onClose={() => setShowPromptTester(false)}
          apiProvider={apiProvider}
          geminiKey={apiKey}
          groqKey={groqKey}
          openRouterKey={openRouterKey}
        />
      )}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export default App;
