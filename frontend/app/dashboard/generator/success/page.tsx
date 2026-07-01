'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Copy, ArrowRight } from 'lucide-react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const password = searchParams.get('password');
  const appName = searchParams.get('appName') || 'Il tuo gestionale';
  
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/a/${slug}`;

  const handleSaveEmail = async () => {
    if (!email.trim() || !slug) return;
    
    setSaving(true);
    
    try {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      });

      // Find app by slug and update email
      const { error } = await supabase
        .from('apps')
        .update({ client_email: email.trim() })
        .eq('slug', slug);

      if (!error) {
        setSaved(true);
        setTimeout(() => {
          router.push('/dashboard/projects');
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving email:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!slug || !password) {
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
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
        }}>
          <h1 style={{ color: '#ffffff', fontSize: '24px', marginBottom: '16px' }}>
            Dati non disponibili
          </h1>
          <Link
            href="/dashboard/generator"
            style={{ color: '#6366f1', textDecoration: 'underline' }}
          >
            Torna al Generator
          </Link>
        </div>
      </div>
    );
  }

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
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {/* Success Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#22c55e20',
          }}>
            <CheckCircle2 size={40} color="#22c55e" />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          color: '#ffffff',
          fontSize: '28px',
          fontWeight: 800,
          textAlign: 'center',
          margin: '0 0 8px 0',
        }}>
          Gestionale Creato!
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px',
          textAlign: 'center',
          margin: '0 0 32px 0',
        }}>
          {appName} è pronto per essere utilizzato
        </p>

        {/* App Link */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Link all'app
          </label>
          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            <input
              type="text"
              value={appUrl}
              readOnly
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '14px',
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#334155',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Copy size={18} />
            </button>
          </div>
          {copied && (
            <p style={{ color: '#22c55e', fontSize: '13px', marginTop: '8px' }}>
              Link copiato!
            </p>
          )}
        </div>

        {/* Password */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Password temporanea
          </label>
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #22c55e40',
            background: '#22c55e10',
            textAlign: 'center',
          }}>
            <span style={{
              color: '#22c55e',
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
            }}>
              {password}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
            Consiglia al cliente di cambiare la password al primo accesso
          </p>
        </div>

        {/* Email for client */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Email del cliente (opzionale)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@azienda.it"
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '15px',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
            />
            <button
              onClick={handleSaveEmail}
              disabled={saving || !email.trim()}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: saving || !email.trim() ? '#475569' : '#6366f1',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving || !email.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
          {saved && (
            <p style={{ color: '#22c55e', fontSize: '13px', marginTop: '8px' }}>
              Email salvata! Reindirizzamento...
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href={appUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 24px',
              borderRadius: '12px',
              border: '1px solid #6366f1',
              background: '#6366f1',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Prova l'app ora
            <ArrowRight size={18} />
          </a>
          
          <Link
            href="/dashboard/projects"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 24px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Torna ai Progetti
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0e1a 0%, #1e1b4b 100%)',
      }}>
        <div style={{ color: '#94a3b8' }}>Caricamento...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
