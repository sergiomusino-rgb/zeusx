'use client';

import { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    try {
      const response = await fetch('https://zeusx-backend.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], provider: 'groq' })
      });

      const data = await response.json();
      console.log("Dati ricevuti dal server:", data); // CONTROLLA QUESTO IN CONSOLE

      if (data && data.reply) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: "Errore: Risposta dal server non valida." }]);
      }
    } catch (err) {
      console.error("Errore fetch:", err);
      setMessages(prev => [...prev, { role: 'ai', text: "Errore di connessione." }]);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-slate-900 p-4 h-96 overflow-y-auto mb-4 border border-slate-700">
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'text-blue-400' : 'text-green-400'}>
            {m.role === 'user' ? 'Tu: ' : 'AI: '} {m.text}
          </p>
        ))}
      </div>
      <input 
        className="w-full p-3 bg-slate-800 text-white"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
      />
      <button onClick={handleSendMessage} className="bg-indigo-600 text-white p-2 mt-2">Invia</button>
    </div>
  );
}