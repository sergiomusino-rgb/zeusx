'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../src/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005';

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Errore dal server';
};

interface Message {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: string; provider?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('groq');
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);
      setAccessToken(session.access_token);
      try {
        const res = await fetch(`${BACKEND_URL}/api/chat/history`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (res.ok) setMessages(await res.json());
      } catch (err) { console.error("Errore storico:", err); }
    };
    init();
  }, [router]);

  // Logica di Retry con Backoff Esponenziale
  const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    retries = 5
  ): Promise<{ reply: string; provider?: string }> => {
    const response = await fetch(url, options);
    
    if (response.status === 503 && retries > 0) {
      const waitTime = (6 - retries) * 2000;
      console.warn(`Server occupato (503). Riprovo tra ${waitTime/1000}s...`);
      await new Promise(res => setTimeout(res, waitTime));
      return fetchWithRetry(url, options, retries - 1);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Errore dal server");
    return data;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId || !accessToken || isSending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const data = await fetchWithRetry(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: userMsg.content, provider }),
      });
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.reply, 
        timestamp: new Date().toLocaleTimeString(), 
        provider: data.provider 
      }]);
    } catch (err: unknown) { 
      console.error("DEBUG INVIO MESSAGGIO:", getErrorMessage(err));
      alert("Il servizio AI è sovraccarico dopo diversi tentativi. Riprova più tardi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-5xl mx-auto border border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between">
        <h2 className="font-bold">Assistente ZEUSX</h2>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="bg-slate-950 text-xs p-1 rounded">
          <option value="groq">Groq</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-slate-800'} max-w-sm`}>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
        <input disabled={isSending} value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-slate-950 p-2 rounded border border-slate-800" />
        <button type="submit" disabled={isSending} className="bg-indigo-600 px-4 py-2 rounded">{isSending ? "..." : "Invia"}</button>
      </form>
    </div>
  );
}
