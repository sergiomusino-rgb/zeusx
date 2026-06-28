'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink, ArrowLeft } from 'lucide-react';

function SuccessContent() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [appName, setAppName] = useState('');
  const [copied, setCopied] = useState<'link' | 'password' | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('slug');
    const p = params.get('password');
    const n = params.get('name');
    
    if (s) setSlug(s);
    if (p) setPassword(p);
    if (n) setAppName(n);
  }, []);

  const fullLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/a/${slug}`
    : `/a/${slug}`;

  const handleCopy = async (text: string, type: 'link' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Errore copia:', err);
    }
  };

  if (!slug || !password) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-400">Nessuna app trovata</p>
          <button
            onClick={() => router.push('/create')}
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            Torna alla creazione
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">App Creata con Successo!</h1>
          <p className="text-slate-400">
            La tua app &ldquo;{appName}&rdquo; è pronta. Ecco le credenziali di accesso per il tuo cliente.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Link dell&apos;App</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 truncate">
                {fullLink}
              </div>
              <button
                onClick={() => handleCopy(fullLink, 'link')}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <Copy size={16} />
                {copied === 'link' ? 'Copiato!' : 'Copia'}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Password Iniziale</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 font-mono">
                {password}
              </div>
              <button
                onClick={() => handleCopy(password, 'password')}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <Copy size={16} />
                {copied === 'password' ? 'Copiato!' : 'Copia'}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-300">
            <p className="font-semibold mb-1">Importante:</p>
            <p>
              Comunica queste credenziali al tuo cliente. Al primo accesso dovrà inserire la sua email, 
              poi potrà usare solo la password. Il cliente potrà cambiare la password in qualsiasi momento.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Torna alla lista app
          </button>
          <a
            href={fullLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} />
            Vai all'app
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CreateSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-400">Caricamento...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
