'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/src/lib/supabase-browser';
import { Trash2, Plus, Loader2, AlertCircle, ExternalLink, Settings, Clock } from 'lucide-react';

interface App {
  id: string;
  name: string;
  slug: string;
  trial_ends_at: string | null;
  is_active: boolean;
  created_at: string;
  client_active: boolean;
  expires_at: string | null;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; appId: string; appName: string }>({
    open: false,
    appId: '',
    appName: '',
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    setLoading(true);
    setError('');
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser();
      
      if (userError || !user) {
        console.log('[Projects] User not logged in');
        setError('Effettua il login per vedere le app create');
        setLoading(false);
        return;
      }

      console.log('[Projects] User:', user.id);

      // Get user's tenant
      const { data: memberships, error: membershipError } = await supabaseBrowser
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('[Projects] membership error:', membershipError);
        setError(`Errore caricamento membership: ${membershipError.message}`);
        setLoading(false);
        return;
      }

      console.log('[Projects] Memberships:', memberships);

      const tenantId = memberships?.[0]?.tenant_id;
      if (!tenantId) {
        console.log('[Projects] No tenant found for user');
        setError('Nessun tenant associato all\'utente');
        setLoading(false);
        return;
      }

      console.log('[Projects] TenantId:', tenantId);

      // Get apps for this tenant
      const { data: appsData, error: appsError } = await supabaseBrowser
        .from('apps')
        .select('id, name, slug, trial_ends_at, is_active, created_at, client_active, expires_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('[Projects] load apps error:', appsError);
        setError('Errore caricamento app: ' + appsError.message);
      } else {
        console.log('[Projects] Apps loaded:', appsData?.length);
        setApps(appsData || []);
      }
    } catch (err) {
      console.error('[Projects] Unexpected error:', err);
      setError('Errore imprevisto: ' + (err instanceof Error ? err.message : 'Errore sconosciuto'));
    }

    setLoading(false);
  }

  const handleDeleteApp = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError('Sessione scaduta');
        return;
      }

      const res = await fetch(`/api/apps/${deleteModal.appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Errore durante l\'eliminazione');
      }

      setApps(apps.filter(a => a.id !== deleteModal.appId));
      setDeleteModal({ open: false, appId: '', appName: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Illimitato';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadge = (app: App) => {
    if (app.expires_at && new Date(app.expires_at) < new Date()) {
      return <span style={{ background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>Scaduto</span>;
    }
    if (app.client_active === false) {
      return <span style={{ background: '#ef444420', color: '#ef4444', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>Disattivato</span>;
    }
    return <span style={{ background: '#22c55e20', color: '#22c55e', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>Attivo</span>;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Caricamento app...</span>
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

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700, margin: 0 }}>Le app create</h1>
          <Link
            href="/dashboard/generator"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', textDecoration: 'none',
            }}
          >
            <Plus size={18} />
            Nuova app
          </Link>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>
          Gestisci le tue app create con ZeusX
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '24px', padding: '16px', borderRadius: '12px', background: '#ef444415', border: '1px solid #ef444440', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} style={{ color: '#ef4444' }} />
          <span style={{ color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {/* Projects Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Nessun progetto ancora</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>Crea la tua prima app con l'AI generator</p>
            <Link
              href="/dashboard/generator"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer', textDecoration: 'none',
              }}
            >
              <Plus size={18} />
              Crea la tua prima app
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {apps.map((app) => (
              <div
                key={app.id}
                style={{
                  background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
                  padding: '24px', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>{app.name}</h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>App creata</p>
                  </div>
                  {getStatusBadge(app)}
                </div>

                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                    <Clock size={14} />
                    <span>Creato: {formatDate(app.created_at)}</span>
                  </div>
                  {app.trial_ends_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
                      <Clock size={14} />
                      <span>Scadenza trial: {formatDate(app.trial_ends_at)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link
                    href={`/a/${app.slug}`}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px 16px', borderRadius: '10px', border: 'none',
                      background: '#6366f1', color: '#fff', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer', textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={16} />
                    Apri
                  </Link>
                  <Link
                    href={`/dashboard/projects/${app.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155',
                      background: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer', textDecoration: 'none',
                    }}
                  >
                    <Settings size={16} />
                  </Link>
                  <button
                    onClick={() => setDeleteModal({ open: true, appId: app.id, appName: app.name })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155',
                      background: 'transparent', color: '#ef4444', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%' }}>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0' }}>Elimina app</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0 0 24px 0' }}>
              Sei sicuro di voler eliminare <strong style={{ color: '#ffffff' }}>{deleteModal.appName}</strong>? L'app verrà eliminata definitivamente.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModal({ open: false, appId: '', appName: '' })}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155',
                  background: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteApp}
                disabled={deleting}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
