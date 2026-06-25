import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Settings, Copy, Check, Loader2, X, History as HistoryIcon, Trash2, Dices, ChevronDown, ChevronUp, Eraser, FileText, Globe, Flame, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
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
      options: ['Cyberpunk', 'Anime', 'Watercolor', 'Oil Painting', 'Minimalist', 'Retro 80s']
    },
    {
      category: 'Photography/Camera',
      options: ['Cinematic', 'Photorealistic', 'Macro Photography', 'Drone/Aerial', 'Polaroid', 'Studio Lighting']
    },
    {
      category: 'Mood/Tone',
      options: ['Dark Fantasy', 'Whimsical', 'Ethereal', 'Gritty/Noir', 'Utopian', 'Surreal']
    }
  ],
  Text: [
    {
      category: 'Engineering & IT',
      options: ['Software Developer', 'Data Analyst', 'Cloud Architect', 'QA Tester', 'Prompt Engineer']
    },
    {
      category: 'Business & Marketing',
      options: ['Product Manager', 'SEO Specialist', 'Copywriter', 'Marketing Strategist', 'Sales Executive']
    },
    {
      category: 'Creative & Content',
      options: ['Content Writer', 'Novelist', 'Screenwriter', 'Editor', 'UX Writer']
    },
    {
      category: 'Professional Services',
      options: ['Legal Advisor', 'Financial Analyst', 'HR/Recruiter', 'Educator', 'Management Consultant']
    }
  ]
};

const CATEGORIES = ['Coding', 'Writing & Content', 'Image Generation', 'Video Generation', 'Research & Data'];

const RANDOM_IDEAS = {
  Visual: ["A samurai frog", "A floating city in the clouds", "A cute robot planting a tree", "A neon-lit noodle shop", "A dragon drinking tea"],
  Text: ["Write a cold email to a CEO", "Explain quantum physics to a 5-year old", "Write a python script for web scraping", "Create a marketing plan for energy drinks", "Write a short sci-fi story about a rogue AI"]
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
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedOrKey = localStorage.getItem('openrouter_api_key');
    const savedGroqKey = localStorage.getItem('groq_api_key');
    const savedProvider = localStorage.getItem('api_provider');
    const savedOrModel = localStorage.getItem('openrouter_model');
    
    if (savedKey) setApiKey(savedKey);
    if (savedOrKey) setOpenRouterKey(savedOrKey);
    if (savedGroqKey) setGroqKey(savedGroqKey);
    if (savedProvider) setApiProvider(savedProvider as 'google' | 'openrouter' | 'groq');
    if (savedOrModel) setOpenRouterModel(savedOrModel);
    
    if (!savedKey && !savedOrKey && !savedGroqKey) setShowSettings(true);

    const savedHistory = localStorage.getItem('prompt_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  const saveApiKey = (key: string) => {
    if (apiProvider === 'google') {
      setApiKey(key);
      localStorage.setItem('gemini_api_key', key);
    } else if (apiProvider === 'openrouter') {
      setOpenRouterKey(key);
      localStorage.setItem('openrouter_api_key', key);
    } else {
      setGroqKey(key);
      localStorage.setItem('groq_api_key', key);
    }
  };

  const handleProviderChange = (provider: 'google' | 'openrouter' | 'groq') => {
    setApiProvider(provider);
    localStorage.setItem('api_provider', provider);
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
          const sysPrompt = `You are an autocomplete engine for a prompt generator tool. The user is in the '${activeCategory}' category. They started typing: '${inputPrompt}'. Generate 3 short, creative ways to complete their thought as a prompt idea. Reply ONLY with a JSON array of 3 strings. Example: ["Develop a python script", "Create a react component", "Build a mobile app"]`;
          
          let aiResponse = '';
          
          if (apiProvider === 'google' && apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: sysPrompt,
              config: { temperature: 0.7 }
            });
            aiResponse = response.text || '';
          } else if (apiProvider === 'groq' && groqKey) {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: sysPrompt }],
                temperature: 0.7
              })
            });
            const data = await res.json();
            aiResponse = data.choices?.[0]?.message?.content || '';
          } else if (apiProvider === 'openrouter' && openRouterKey) {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openRouterKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'PromptCrafter',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: openRouterModel || 'openrouter/free',
                messages: [{ role: 'user', content: sysPrompt }],
                temperature: 0.7
              })
            });
            const data = await res.json();
            aiResponse = data.choices?.[0]?.message?.content || '';
          }

          if (aiResponse) {
            try {
              // Robust JSON array extraction
              const jsonMatch = aiResponse.match(/\[.*\]/s);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setAutocompleteSuggestions(parsed.slice(0, 3));
                }
              } else {
                console.error("No JSON array found in AI response:", aiResponse);
                setShowSuggestions(false);
              }
            } catch (e) {
              console.error("Failed to parse AI autocomplete:", e, "Raw:", aiResponse);
              setShowSuggestions(false);
            }
          } else {
            setShowSuggestions(false);
          }
        } catch (e) {
          console.error("AI Prediction Error:", e);
          setShowSuggestions(false);
        } finally {
          setIsPredicting(false);
        }
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timer);
    } else {
      setShowSuggestions(false);
      setIsPredicting(false);
    }
    
  }, [inputPrompt, activeCategory, apiProvider, apiKey, groqKey, openRouterKey, openRouterModel]);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('prompt_history', JSON.stringify(newHistory));
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const changeCategory = (cat: string) => {
    if (activeCategory !== cat) {
      const wasVisual = activeCategory.includes('Image') || activeCategory.includes('Video');
      const isVisual = cat.includes('Image') || cat.includes('Video');
      if (wasVisual !== isVisual) {
        setSelectedStyles([]);
      }
      setActiveCategory(cat);
    }
  };

  const isVisualCategory = activeCategory.includes('Image') || activeCategory.includes('Video');
  const currentStyleData = isVisualCategory ? STYLE_CATEGORIES.Visual : STYLE_CATEGORIES.Text;

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

  const fileToGenerativePart = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const executeGeneration = async (promptText: string, stylesToUse: string[], retryCount = 0) => {
    if (apiProvider === 'google' && !apiKey) {
      alert('Please set your Gemini API key first!');
      setShowSettings(true);
      return;
    }
    if (apiProvider === 'openrouter' && !openRouterKey) {
      alert('Please set your OpenRouter API key first!');
      setShowSettings(true);
      return;
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

      const systemInstruction = `You are a legendary, world-class prompt engineer. 
Your task is to take a simple, short sentence (and optionally an image reference, document, or web context) and transform it into an incredibly detailed, highly specific, and creative prompt.
${categoryInstruction}
${platformInstruction}
${stylesInstruction}
${extraContext}
If an image or document is provided, use its contents to inspire and flesh out the specific details.
Do not include any pleasantries or conversational filler. Output ONLY the generated prompt.`;

      let resultText = '';

      if (apiProvider === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        let contents: any[] = [];
        if (promptText.trim()) contents.push(promptText);
        if (imageFile) {
          const documentPart = await fileToGenerativePart(imageFile);
          contents.push(documentPart);
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
          }
        });
        resultText = response.text || 'Failed to generate prompt.';
      } else if (apiProvider === 'groq') {
        if (imageFile) {
          throw new Error("Image uploads are not currently supported when using Groq. Please switch back to Google Gemini in Settings to upload images, or remove the image.");
        }
        if (!groqKey) {
          throw new Error("Please set your Groq API key in Settings first.");
        }
        
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: promptText }
            ],
            temperature: 0.8
          })
        });

        if (!groqResponse.ok) {
          const errorData = await groqResponse.json();
          throw new Error(errorData?.error?.message || `Groq Error: ${groqResponse.status}`);
        }

        const data = await groqResponse.json();
        resultText = data.choices?.[0]?.message?.content || 'Failed to generate prompt via Groq.';
      } else {
        // OpenRouter Fallback
        if (imageFile) {
          throw new Error("Image uploads are not currently supported when using OpenRouter. Please switch back to Google Gemini in Settings to upload images, or remove the image.");
        }
        
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': window.location.href, // Required by OpenRouter
            'X-Title': 'PromptCrafter', // Required by OpenRouter
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: promptText }
            ],
            temperature: 0.8
          })
        });

        if (!openRouterResponse.ok) {
          const errorData = await openRouterResponse.json();
          throw new Error(errorData?.error?.message || `OpenRouter Error: ${openRouterResponse.status}`);
        }

        const data = await openRouterResponse.json();
        resultText = data.choices?.[0]?.message?.content || 'Failed to generate prompt via OpenRouter.';
      }
      setGeneratedPrompt(resultText);

      if (retryCount === 0) {
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          shortIdea: promptText || 'From Context/Upload',
          fullPrompt: resultText,
          timestamp: Date.now()
        };
        saveHistory([newHistoryItem, ...history]);
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
      const ideasList = isVisualCategory ? RANDOM_IDEAS.Visual : RANDOM_IDEAS.Text;
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
              <button className="icon-btn" onClick={() => setShowHistory(true)} title="Toggle History" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
                <HistoryIcon size={20} />
              </button>
              <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
                <Settings size={20} />
              </button>
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
                    <option value="openrouter/free">Auto-Router (Best Available)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct (Meta)</option>
                    <option value="google/gemma-4-31b-it:free">Gemma 4 31B (Google)</option>
                    <option value="nvidia/nemotron-3-super-120b-a12b:free">Nemotron 3 120B (NVIDIA)</option>
                  </select>
                </div>
              )}

              <div className="input-group">
                <label>{apiProvider === 'google' ? 'Gemini API Key' : apiProvider === 'openrouter' ? 'OpenRouter API Key' : 'Groq API Key'}</label>
                <input 
                  type="password" 
                  value={apiProvider === 'google' ? apiKey : apiProvider === 'openrouter' ? openRouterKey : groqKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder={apiProvider === 'google' ? "AIzaSy..." : apiProvider === 'openrouter' ? "sk-or-v1-..." : "gsk_..."}
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
              <h3 style={{ marginTop: 0 }}>Prompt History</h3>
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
                      <button className="history-copy-btn" onClick={() => copyToClipboard(item.fullPrompt)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(!showSettings && !showHistory) && (
            <>
              <div className="input-group" style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>What do you want to create?</label>
              <select 
                value={activeCategory}
                onChange={(e) => changeCategory(e.target.value)}
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
            <div style={{ position: 'relative' }}>
              <textarea 
                value={inputPrompt}
                onChange={(e) => {
                  setInputPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = (e.target.scrollHeight) + 'px';
                }}
                placeholder={`e.g. ${isVisualCategory ? "A neon-lit futuristic city" : "Explain React hooks to a beginner"}`}
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
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }
                }}
                style={{ 
                  padding: '1.2rem', 
                  fontSize: '1.1rem', 
                  width: '100%', 
                  borderRadius: '12px', 
                  border: '1px solid var(--panel-border)', 
                  background: '#ffffff',
                  resize: 'none',
                  minHeight: '60px',
                  maxHeight: '200px',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
              
              {showSuggestions && (autocompleteSuggestions.length > 0 || isPredicting) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  marginTop: '0.25rem',
                  zIndex: 50,
                  overflow: 'hidden'
                }}>
                  {isPredicting ? (
                    <div style={{
                      padding: '1rem 1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.95rem'
                    }}>
                      <Loader2 size={16} className="spin" color="var(--accent)" />
                      AI is thinking of ideas...
                    </div>
                  ) : (
                    autocompleteSuggestions.map((suggestion, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setInputPrompt(suggestion);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: '0.8rem 1.2rem',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          color: 'var(--text-main)',
                          borderBottom: idx < autocompleteSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: idx === selectedSuggestionIndex ? '#f9fafb' : 'transparent'
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        onMouseLeave={() => setSelectedSuggestionIndex(-1)}
                      >
                        <Sparkles size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {highlightMatch(suggestion, inputPrompt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Press Cmd/Ctrl + Enter to generate
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
                <label>{isVisualCategory ? 'Aesthetics & Modifiers' : 'Occupations & Roles'}</label>
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
                <button className="copy-btn" onClick={() => copyToClipboard(generatedPrompt)} title="Copy to clipboard">
                  {copied ? <Check size={18} color="#4ade80" /> : <Copy size={18} />}
                </button>
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
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="generate-btn" onClick={() => { copyToClipboard(selectedHistoryItem.fullPrompt); setSelectedHistoryItem(null); }}>
                <Copy size={16} /> Copy Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
