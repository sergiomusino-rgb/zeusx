'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getAccessTokenFromStorage } from '@/src/lib/supabase';

export default function CreateAppPage() {
  const router = useRouter();
  const [sector, setSector] = useState('');
  const [prompt, setPrompt] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function uploadLogo(file: File): Promise<string> {
    const fileName = `logos/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('app-logos')
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('app-logos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  const handleCreate = async () => {
    if (!sector.trim()) {
      setError('Inserisci un settore');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || getAccessTokenFromStorage();
      if (!token) {
        setError('Sessione scaduta. Effettua di nuovo il login.');
        return;
      }

      let logo = '';
      if (logoFile) {
        try {
          logo = await uploadLogo(logoFile);
        } catch (err) {
          console.error('Errore upload logo:', err);
          // Continua anche se il logo fallisce
        }
      }

      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sector, prompt, logo }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403 && data.error === 'UpgradeToProRequired') {
          router.push('/pricing');
          return;
        }
        throw new Error(data.error || 'Errore creazione app');
      }

      router.push(`/dashboard/projects?app=${data.app.id}`);
    } catch (err) {
      console.error('Errore creazione app:', err);
      setError(err instanceof Error ? err.message : 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Crea la tua App con ZeusX</h1>

      <label className="block text-sm font-medium mb-2">Settore</label>
      <input
        type="text"
        className="w-full p-4 border rounded-lg mb-4 bg-gray-900 border-gray-700 text-white"
        placeholder="Es: oculista, officina, ristorante, magazzino..."
        value={sector}
        onChange={(e) => setSector(e.target.value)}
      />

      <label className="block text-sm font-medium mb-2">Logo azienda (opzionale)</label>
      <div className="mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          className="w-full p-3 border rounded-lg bg-gray-900 border-gray-700 text-white text-sm"
        />
        {logoFile && (
          <p className="text-sm text-emerald-400 mt-1">{logoFile.name}</p>
        )}
      </div>

      <label className="block text-sm font-medium mb-2">Richiesta aggiuntiva (opzionale)</label>
      <textarea
        className="w-full p-4 border rounded-lg min-h-[150px] bg-gray-900 border-gray-700 text-white"
        placeholder="Es: Voglio tracciare appuntamenti, clienti e fatture..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

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
