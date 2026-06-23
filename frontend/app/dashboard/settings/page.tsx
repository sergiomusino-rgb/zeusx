'use client';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-slate-400 mt-1">Gestisci le configurazioni del tuo account, le chiavi API e la fatturazione.</p>
      </div>

      <div className="space-y-6">
        
        {/* SEZIONE 1: PROFILO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800/60 pb-2">Profilo Utente</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Nome</label>
              <input 
                type="text" 
                defaultValue="Sergio" 
                disabled
                className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Account Status</label>
              <div className="w-full bg-slate-950 border border-slate-800 text-emerald-400 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Attivo
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 2: PIANO E FATTURAZIONE (STRIPE MOCK) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-2">
            <h3 className="text-base font-bold text-slate-200">Piano & Abbonamento</h3>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              Piano PRO Attivo
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Rinnovo Automatico</p>
              <p className="text-xs text-slate-500 mt-0.5">Il prossimo addebito avverrà tramite Stripe il mese prossimo.</p>
            </div>
            <button 
              type="button"
              onClick={() => alert('Funzionalità di reindirizzamento al portale Stripe Customer Billing in arrivo!')}
              className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition font-medium whitespace-nowrap"
            >
              Gestisci su Stripe 💳
            </button>
          </div>
        </div>

        {/* SEZIONE 3: SVILUPPO & CHIAVI (SUPABASE INTEGRAZIONE PREVISTA) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800/60 pb-2">Integrazione di Sistema</h3>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              L&apos;autenticazione, la sicurezza dei dati e la persistenza dei progetti di questa dashboard sono pronte per essere agganciate a **Supabase**.
            </p>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl font-mono text-[11px] text-slate-500 space-y-1">
              <div>DB_STATUS: <span className="text-amber-500">READY_FOR_SETUP</span></div>
              <div>AUTH_PROVIDER: <span className="text-indigo-400">Supabase Auth</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}