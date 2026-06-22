'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inizializza Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateAppPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!prompt) return;
    setLoading(true);

    try {
      // 1. Chiamata corretta al tuo server Node.js sulla porta 5005
      const res = await fetch('http://localhost:5005/generate-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, lang: 'it' }),
      });
      
      if (!res.ok) throw new Error("Errore nella comunicazione con il backend");
      
      const config = await res.json();

      // 2. Ottieni l'utente corrente
      const { data: { user } } = await supabase.auth.getUser();

      // 3. Salva la configurazione in Supabase
      const { data, error } = await supabase
        .from('app_definitions')
        .insert([
          { 
            app_name: config.appName, 
            config: config, 
            user_id: user?.id || '00000000-0000-0000-0000-000000000000' 
          }
        ])
        .select();

      if (error) throw error;

      alert(`App "${config.appName}" creata e salvata con successo!`);
      setPrompt(''); // Pulisce il campo dopo il successo
    } catch (error) {
      console.error("Errore:", error);
      alert("Si è verificato un errore. Assicurati che il server sulla porta 5005 sia attivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Crea la tua App con ZeusX</h1>
      <textarea 
        className="w-full p-4 border rounded-lg min-h-[150px]"
        placeholder="Es: Crea un'app per gestire il magazzino della pizzeria con nome prodotto e quantità..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button 
        onClick={handleCreate}
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        {loading ? 'ZeusX sta costruendo la tua app...' : 'Genera App'}
      </button>
    </div>
  );
}