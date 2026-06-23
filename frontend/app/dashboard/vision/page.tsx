'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../src/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005';

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Si è verificato un errore imprevisto.";
};

export default function VisionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const startAnalysis = async () => {
    if (!file) return alert("Seleziona un file prima!");
    
    setLoading(true);
    setError(null);
    setResult('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const image = reader.result as string;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        router.push('/login');
        return;
      }

      // Funzione ricorsiva di retry
      const fetchWithRetry = async (retries = 3): Promise<{ reply: string }> => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/vision/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ image, prompt }),
          });

          // Se il server è sovraccarico (503)
          if (response.status === 503) {
            if (retries > 0) {
              console.warn(`Servizio occupato (503). Tentativi rimasti: ${retries - 1}`);
              await new Promise(res => setTimeout(res, 3000));
              return fetchWithRetry(retries - 1);
            }
          }

          const json = await response.json();

          if (!response.ok) {
            throw new Error(json.error || "Errore dal server durante l'analisi.");
          }
          return json;
        } catch (err: unknown) {
          // Se l'errore è di rete o un 503 non intercettato dallo status
          if (retries > 0) {
            await new Promise(res => setTimeout(res, 3000));
            return fetchWithRetry(retries - 1);
          }
          throw err;
        }
      };

      try {
        const json = await fetchWithRetry();
        setResult(json.reply);
      } catch (err: unknown) {
        console.error("Errore finale:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Errore nella lettura del file.");
      setLoading(false);
    };
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-slate-300">
      <h1 className="text-2xl font-bold mb-6">ZEUSX Vision AI</h1>
      
      <div className="grid grid-cols-2 gap-8">
        <label htmlFor="fileInput" className="border-2 border-dashed border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer min-h-[250px] hover:border-indigo-500 transition-all">
          {previewUrl ? (
            <div style={{ backgroundImage: `url(${previewUrl})` }} className="w-full h-48 bg-contain bg-center bg-no-repeat rounded-lg" />
          ) : (
            <p className="text-center">Trascina qui o clicca per caricare</p>
          )}
          <input id="fileInput" type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
        </label>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-sm font-bold mb-4">Risultato</h2>
          {error ? (
            <p className="text-red-400 text-sm italic">{error}</p>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{result || "L'analisi apparirà qui..."}</p>
          )}
        </div>
      </div>

      <textarea 
        className="w-full mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500" 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        placeholder="Cosa deve fare l'AI?..." 
      />
      
      <button 
        onClick={startAnalysis} 
        disabled={loading} 
        className={`mt-4 w-full py-3 rounded-xl font-bold transition-all ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        {loading ? "Analisi in corso (tentativo automatico in caso di errore)..." : "Avvia Analisi Vision"}
      </button>
    </div>
  );
}
