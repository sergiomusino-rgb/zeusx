'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateAppAction, type GenerateAppInput } from '@/app/actions/generator';

export default function GeneratorPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [appName, setAppName] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; slug?: string; password?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const input: GenerateAppInput = {
        prompt: prompt.trim(),
        appName: appName.trim() || undefined,
        sector: sector.trim() || undefined,
      };

      const res = await generateAppAction(input);
      setResult(res);

      if (res.success && res.slug) {
        // Redirect to success page with app details
        setTimeout(() => {
          router.push(`/dashboard/generator/success?slug=${res.slug}&password=${res.password}&appName=${encodeURIComponent(appName || 'Gestionale')}`);
        }, 1500);
      }
    } catch {
      setResult({ success: false, error: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #1e1b4b 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '640px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {/* Back Button */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.color = '#e2e8f0';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = '#334155';
            }}
          >
            ← Torna alla Dashboard
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            marginBottom: '20px',
          }}>
            <Sparkles size={32} color="#fff" />
          </div>
          <h1 style={{
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: 800,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
          }}>
            Crea il tuo gestionale con l'AI
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '16px',
            lineHeight: '1.6',
            margin: 0,
          }}>
            Descrivi il gestionale che desideri e l'AI lo creerà per te in pochi secondi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Prompt */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#e2e8f0',
            }}>
              Descrivi il tuo gestionale
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Es: Un gestionale per uno studio dentistico con gestione pazienti, appuntamenti e trattamenti..."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '15px',
                lineHeight: '1.5',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
            />
          </div>

          {/* App Name (optional) */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#e2e8f0',
            }}>
              Nome dell'app <span style={{ color: '#64748b', fontWeight: 400 }}>(opzionale)</span>
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Es: Studio Dentistico Rossi"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
            />
          </div>

          {/* Sector (optional) */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#e2e8f0',
            }}>
              Settore <span style={{ color: '#64748b', fontWeight: 400 }}>(opzionale)</span>
            </label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Es: sanitario, ecommerce, ristorante..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              background: loading || !prompt.trim()
                ? '#475569'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginTop: '8px',
            }}
            onMouseEnter={(e) => {
              if (!loading && prompt.trim()) {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Generazione in corso...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Crea il mio gestionale
              </>
            )}
          </button>
        </form>

        {/* Result Messages */}
        {result && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: result.success ? '#22c55e15' : '#ef444415',
            border: `1px solid ${result.success ? '#22c55e40' : '#ef444440'}`,
          }}>
            {result.success ? (
              <>
                <CheckCircle2 size={24} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#22c55e', fontSize: '15px', fontWeight: 600 }}>
                    Gestionale creato con successo!
                  </div>
                  {result.password && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'left' }}>
                      <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>Password temporanea:</div>
                      <div style={{ color: '#22c55e', fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>{result.password}</div>
                    </div>
                  )}
                  <a 
                    href={`/a/${result.slug}`}
                    style={{ marginTop: '16px', display: 'inline-block', color: '#6366f1', textDecoration: 'underline' }}
                  >
                    Apri l'app →
                  </a>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    Reindirizzamento in corso...
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#ef4444', fontSize: '15px', fontWeight: 600 }}>
                    Errore
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                    {result.error}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Examples */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          borderRadius: '12px',
          background: '#0f172a',
          border: '1px solid #334155',
        }}>
          <div style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            Esempi di prompt
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Gestionale per un ristorante con menu, ordini e prenotazioni',
              'CRM per agenzia immobiliare con clienti e immobili',
              'Gestione progetti per studio di consulenza',
            ].map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(example)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.color = '#e2e8f0';
                  e.currentTarget.style.borderColor = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = '#334155';
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}