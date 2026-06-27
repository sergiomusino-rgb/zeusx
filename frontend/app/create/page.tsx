'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getAccessTokenFromStorage } from '@/src/lib/supabase';
import { SECTOR_TEMPLATES, type SectorTemplate, type ModuleTemplate } from '@/lib/sector-templates';

const SECTOR_ICONS: Record<string, string> = {
  medico: '\u{1FA7A}',
  ristorazione: '\u{1F37D}\uFE0F',
  retail: '\u{1F3EA}',
  officina: '\u{1F527}',
};

const SECTOR_GRADIENTS: Record<string, string> = {
  medico: 'from-blue-600 to-cyan-500',
  ristorazione: 'from-orange-500 to-amber-400',
  retail: 'from-emerald-500 to-teal-400',
  officina: 'from-purple-600 to-indigo-500',
};

function ModulePreview({ module }: { module: ModuleTemplate }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{module.icon || '\u{1F4CB}'}</span>
        <h4 className="font-bold text-sm">{module.labelPlural}</h4>
      </div>
      <div className="space-y-1.5">
        {module.fields.slice(0, 4).map((f) => (
          <div key={f.id} className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{f.label}</span>
            <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{f.type}</span>
          </div>
        ))}
        {module.fields.length > 4 && (
          <div className="text-xs text-slate-500 pt-1">
            +{module.fields.length - 4} altri campi
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateAppPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSector, setSelectedSector] = useState<SectorTemplate | null>(null);
  const [appName, setAppName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function uploadLogo(file: File): Promise<string> {
    const fileName = `logos/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('app-logos')
      .upload(fileName, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('app-logos').getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  const handleCreate = async () => {
    if (!appName.trim()) {
      setError('Inserisci un nome per la tua app');
      return;
    }
    if (!selectedSector) {
      setError('Seleziona un settore');
      return;
    }
    setError('');
    setLoading(true);

    console.log('[CreateApp] Starting creation...', { appName, sector: selectedSector.id });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || getAccessTokenFromStorage();
      if (!token) {
        setError('Sessione scaduta. Effettua di nuovo il login.');
        setLoading(false);
        return;
      }

      let logo = '';
      if (logoFile) {
        try { logo = await uploadLogo(logoFile); } catch { /* continua */ }
      }

      console.log('[CreateApp] Sending request to /api/apps');
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sector: selectedSector.id,
          name: appName,
          prompt,
          logo,
        }),
      });

      console.log('[CreateApp] Response status:', res.status);
      const data = await res.json().catch(() => ({}));
      console.log('[CreateApp] Response data:', data);

      if (!res.ok) {
        if (res.status === 403 && data.error === 'UpgradeToProRequired') {
          router.push('/pricing');
          return;
        }
        throw new Error(data.error || data.message || `Errore ${res.status}`);
      }

      console.log('[CreateApp] Success, redirecting to app viewer');
      router.push(`/app/${data.app.id}`);
    } catch (err) {
      console.error('[CreateApp] Errore:', err);
      const errorMsg = err instanceof Error ? err.message : 'Errore durante la creazione';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">
              ⚡
            </div>
            <div>
              <h1 className="text-2xl font-bold">Crea la tua App</h1>
              <p className="text-slate-400 text-sm">Configura il tuo gestionale in 3 semplici passi</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0 mt-8">
            {[
              { n: 1, label: 'Settore' },
              { n: 2, label: 'Configurazione' },
              { n: 3, label: 'Conferma' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step >= s.n
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className={`text-sm font-medium ${step >= s.n ? 'text-white' : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step > s.n ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ──── STEP 1: Settore ──── */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Scegli il tuo settore</h2>
            <p className="text-slate-400 mb-10">Ogni settore include moduli preconfigurati pronti all'uso. Seleziona quello più adatto alla tua attività.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SECTOR_TEMPLATES.map((sector) => {
                const isSelected = selectedSector?.id === sector.id;
                return (
                  <button
                    key={sector.id}
                    onClick={() => setSelectedSector(sector)}
                    className={`group relative text-left p-8 rounded-2xl border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50 hover:scale-[1.01]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                        ✓
                      </div>
                    )}
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${SECTOR_GRADIENTS[sector.id] || 'from-slate-600 to-slate-500'} flex items-center justify-center text-4xl mb-5 shadow-lg`}>
                      {SECTOR_ICONS[sector.id] || '💼'}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{sector.name}</h3>
                    <p className="text-slate-400 text-sm mb-5 leading-relaxed">{sector.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {sector.modules.map((m) => (
                        <span
                          key={m.name}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                            isSelected
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {m.icon || '📋'} {m.labelPlural}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      {sector.modules.length} moduli · {sector.modules.reduce((acc, m) => acc + m.fields.length, 0)} campi totali
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end mt-10">
              <button
                onClick={() => selectedSector && setStep(2)}
                disabled={!selectedSector}
                className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continua →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Configurazione ──── */}
        {step === 2 && selectedSector && (
          <div>
            <h2 className="text-xl font-bold mb-1">Configura la tua app</h2>
            <p className="text-slate-400 mb-8">Dai un nome alla tua app e personalizza i dettagli.</p>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Nome app */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Nome dell&apos;app <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  placeholder="Es: Studio Dentistico Rossi"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>

              {/* Preview settore selezionato */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Moduli inclusi ({selectedSector.modules.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedSector.modules.map((module) => (
                    <div key={module.name} className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{module.icon || '📋'}</span>
                      <span className="text-slate-300">{module.labelPlural}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between mt-10 max-w-2xl mx-auto">
              <button
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white px-6 py-3 font-medium transition"
              >
                ← Indietro
              </button>
              <button
                onClick={() => { if (appName.trim()) setStep(3); }}
                disabled={!appName.trim()}
                className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Rivedi →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Conferma ──── */}
        {step === 3 && selectedSector && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-1">Riepilogo</h2>
            <p className="text-slate-400 mb-8">Controlla i dettagli prima di generare la tua app.</p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${SECTOR_GRADIENTS[selectedSector.id]} flex items-center justify-center text-xl flex-shrink-0`}>
                  {SECTOR_ICONS[selectedSector.id]}
                </div>
                <div>
                  <div className="text-sm text-slate-400">Settore</div>
                  <div className="text-lg font-bold">{selectedSector.name}</div>
                </div>
              </div>

              <div className="border-t border-slate-800" />

              <div>
                <div className="text-sm text-slate-400 mb-1">Nome app</div>
                <div className="text-lg font-bold">{appName}</div>
              </div>

              {logoFile && (
                <>
                  <div className="border-t border-slate-800" />
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Logo</div>
                    <div className="text-sm text-slate-300">{logoFile.name}</div>
                  </div>
                </>
              )}

              {prompt && (
                <>
                  <div className="border-t border-slate-800" />
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Richiesta aggiuntiva</div>
                    <div className="text-sm text-slate-300">{prompt}</div>
                  </div>
                </>
              )}

              <div className="border-t border-slate-800" />
              <div>
                <div className="text-sm text-slate-400 mb-2">Moduli che verranno creati</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSector.modules.map((m) => (
                    <span
                      key={m.name}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-medium"
                    >
                      {m.icon || '📋'} {m.labelPlural} ({m.fields.length} campi)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between mt-10">
              <button
                onClick={() => setStep(2)}
                className="text-slate-400 hover:text-white px-6 py-3 font-medium transition"
              >
                ← Indietro
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="bg-indigo-500 text-white px-10 py-3 rounded-xl font-semibold hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  '⚡ Genera App'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
