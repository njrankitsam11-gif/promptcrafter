import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Settings, Copy, Check, Loader2, X, History as HistoryIcon, Trash2, Dices, ChevronDown, ChevronUp, Eraser, FileText, Globe, Flame } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import './App.css';

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

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if (savedKey) setApiKey(savedKey);
    else setShowSettings(true);

    const savedHistory = localStorage.getItem('prompt_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

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
    if (!apiKey) {
      alert('Please set your Gemini API key first!');
      setShowSettings(true);
      return;
    }
    if (!promptText.trim() && !imageFile && !scrapedContext && trendingContext.length === 0) return;

    if (retryCount === 0) {
      setIsLoading(true);
      setGeneratedPrompt('');
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
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

      const resultText = response.text || 'Failed to generate prompt.';
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
      
      const isTempError = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
      
      if (isTempError && retryCount < 3) {
        const waitMs = Math.pow(2, retryCount) * 1000;
        setGeneratedPrompt(`⚠️ High demand detected. Automatically retrying in ${waitMs/1000}s...`);
        setTimeout(() => {
          executeGeneration(promptText, stylesToUse, retryCount + 1);
        }, waitMs);
      } else {
        if (isTempError) {
          setGeneratedPrompt('⚠️ Google Gemini API is currently experiencing extreme demand. Please try again later.');
        } else {
          setGeneratedPrompt(`Error: ${errMsg}`);
        }
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
          <div className="panel-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', paddingBottom: 0 }}>
            <button className="icon-btn" onClick={() => setShowHistory(!showHistory)} title="Toggle History" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
              <HistoryIcon size={20} />
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Settings" style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
              <Settings size={20} />
            </button>
          </div>

          {showSettings && (
            <div className="settings-panel">
              <div className="input-group">
                <label>Gemini API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                />
              </div>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.4rem' }}>
              Press Cmd/Ctrl + Enter to generate
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
                {isLoading ? 'Crafting your legendary prompt...' : generatedPrompt}
              </div>
              {!isLoading && generatedPrompt && (
                <button className="copy-btn" onClick={() => copyToClipboard(generatedPrompt)} title="Copy to clipboard">
                  {copied ? <Check size={18} color="#4ade80" /> : <Copy size={18} />}
                </button>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {showHistory && (
          <div className="glass-panel history-panel fade-in">
            <h3>Prompt History</h3>
            {history.length === 0 ? (
              <p className="empty-history">No prompts generated yet.</p>
            ) : (
              <div className="history-list">
                {history.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <span className="history-idea">{item.shortIdea}</span>
                      <button className="delete-history-btn" onClick={() => deleteHistoryItem(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div 
                      className="history-prompt" 
                      onClick={() => setSelectedHistoryItem(item)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full prompt"
                    >
                      {item.fullPrompt}
                    </div>
                    <button className="history-copy-btn" onClick={() => copyToClipboard(item.fullPrompt)}>
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
