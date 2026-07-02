import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, User } from 'lucide-react';

interface PromptTesterProps {
  systemPrompt: string;
  onClose: () => void;
  apiProvider: string;
  geminiKey: string;
  groqKey: string;
  openRouterKey: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function PromptTester({ systemPrompt, onClose, apiProvider, geminiKey, groqKey, openRouterKey }: PromptTesterProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // In a real chat app, you'd send the full conversation history.
      // For this simple tester, we just send the system prompt + latest user message, 
      // but ideally we'd send the history to OpenRouter/Groq. 
      // Since /api/generate doesn't take history array, we'll just test single-shot responses for now,
      // or we can append the history to the promptText.
      
      let contextBuilder = '';
      messages.forEach(m => {
        contextBuilder += `${m.role.toUpperCase()}: ${m.content}\n`;
      });
      contextBuilder += `USER: ${userMessage.content}\nASSISTANT: `;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: apiProvider,
          geminiKey,
          groqKey,
          openRouterKey,
          systemInstruction: systemPrompt,
          promptText: contextBuilder, // Passing history as a raw text string for /api/generate
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
         throw new Error(data.error || 'Failed to generate response.');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.result || 'No response.' }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>Test Prompt Live</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              <Bot size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto', display: 'block' }} />
              <p>This AI is now operating under your generated System Prompt.</p>
              <p style={{ fontSize: '0.85rem' }}>Say hello to test its behavior!</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--panel-bg)',
                color: m.role === 'user' ? '#fff' : 'var(--text-main)',
                padding: '0.8rem 1.2rem',
                borderRadius: '12px',
                border: m.role === 'assistant' ? '1px solid var(--panel-border)' : 'none',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', fontSize: '0.75rem', opacity: 0.7 }}>
                  {m.role === 'user' ? <User size={12}/> : <Bot size={12}/>}
                  {m.role === 'user' ? 'You' : 'AI'}
                </div>
                {m.content}
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--panel-bg)', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--panel-border)', padding: '1rem', display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Send a message to test your prompt..."
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-main)' }}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{ padding: '0 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
