import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector';

export default function InfoPage() {
  const plans = [
    {
      name: 'STARTER',
      setup: '€4,99',
      monthly: '25€/mese per app',
      slots: 1,
      features: [
        '1 slot app incluso',
        '1 mese gratis di prova',
        'Fee mensile: 25€/app (dopo il mese gratis)',
        'Supporto email',
        'Trial 30 giorni inclusi',
      ],
    },
    {
      name: 'PRO',
      setup: '€50',
      monthly: '25€/mese per app',
      slots: 5,
      features: [
        '5 slot app inclusi',
        'Fee mensile: 25€/app',
        'Trial 30 giorni inclusi',
        'Supporto prioritario',
        'API illimitate',
      ],
    },
    {
      name: 'BUSINESS',
      setup: '€250',
      monthly: '25€/mese per app',
      slots: 100,
      features: [
        '100 slot app inclusi',
        'Fee mensile: 25€/app',
        'Trial 30 giorni inclusi',
        'Supporto dedicato 24/7',
        'API illimitate',
        'SLA garantito',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <Link href="/" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
          ← Torna alla home
        </Link>
        <Link href="/" className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-2xl font-black tracking-wider text-transparent">
          ⚡ ZEUSX
        </Link>
        <LanguageSelector />
      </header>

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-20">
        {/* Header bar fissato in alto */}

        {/* Prezzi */}
        <h1 className="text-4xl md:text-5xl font-black mb-4">I nostri piani</h1>
        <p className="text-slate-400 mb-12 text-lg">
          Scegli il piano più adatto al tuo business. Tutti i piani includono 30 giorni di prova gratuita.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50"
            >
              <h2 className="text-2xl font-black mb-4">{plan.name}</h2>

              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.setup}</span>
                  <span className="text-slate-400 text-sm">setup</span>
                </div>
                <div className="text-sm text-slate-400 mt-1">+ {plan.monthly}</div>
              </div>

              <div className="mb-4 px-3 py-2 bg-slate-800/50 rounded-lg">
                <span className="text-sm font-semibold">{plan.slots} slot app</span>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Come funziona il billing */}
        <div className="mb-16 p-8 bg-slate-900 rounded-2xl border border-slate-800">
          <h3 className="text-2xl font-bold mb-6">Come funziona il billing</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-400">
            <div>
              <div className="font-semibold text-white mb-2 text-base">1. Setup una tantum</div>
              <p>Paghi una volta per sbloccare gli slot app del piano scelto. Il pagamento è singolo, non ricorrente.</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-2 text-base">2. Fee mensile per app</div>
              <p>Ogni app attiva ha un fee mensile del piano scelto. Il primo mese è gratis per tutte le app.</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-2 text-base">3. Riacquista quando serve</div>
              <p>Quando esaurisci gli slot, puoi riacquistare lo stesso piano per rigenerare tutti gli slot disponibili.</p>
            </div>
          </div>
        </div>

        {/* Termini e condizioni */}
        <h2 className="text-3xl font-black mb-6">Termini e Condizioni</h2>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">1. Descrizione del servizio</h3>
            <p>
              ZeusX è una piattaforma di generazione di gestionali basata su intelligenza artificiale.
              Ogni piano acquistato include un numero di &quot;slot app&quot; che corrispondono al numero
              massimo di gestionali che puoi creare e gestire contemporaneamente.
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">2. Pagamenti e fatturazione</h3>
            <p>
              Il pagamento del setup è <strong className="text-white">una tantum</strong> e non ricorrente.
              Ogni slot app acquistato può essere utilizzato per creare un gestionale. Una volta creato,
              lo slot viene occupato permanentemente e non si libera nemmeno se l&apos;app viene eliminata.
            </p>
            <p className="mt-3">
              Il fee mensile per app attiva viene addebitato mensilmente a partire dal secondo mese
              (il primo mese è gratuito per ogni nuova app).
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">3. Slot app e creazione</h3>
            <p>
              Ogni app creata occupa permanentemente uno slot, indipendentemente dal fatto che venga
              successivamente eliminata. Questo perché la creazione dell&apos;app ha già comportato
              l&apos;utilizzo di risorse computazionali e di storage.
            </p>
            <p className="mt-3">
              Quando tutti gli slot di un piano sono esauriti, è possibile riacquistare lo stesso piano
              per rigenerare il numero di slot disponibili.
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">4. Periodo di prova</h3>
            <p>
              Ogni piano include un periodo di prova di 30 giorni per ogni app creata. Durante il periodo
              di prova, non viene addebitato alcun fee mensile. Al termine del trial, il fee mensile viene
              addebitato automaticamente a meno che l&apos;app non venga disattivata.
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">5. Cancellazione e rimborso</h3>
            <p>
              Il pagamento del setup non è rimborsabile. Non sono previsti rimborsi parziali per slot
              non utilizzati. Puoi cancellare il tuo account in qualsiasi momento, ma i pagamenti già
              effettuati non verranno rimborsati.
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">6. Proprietà intellettuale</h3>
            <p>
              I gestionali generati tramite ZeusX sono di proprietà del cliente che li ha commissionati.
              ZeusX si riserva il diritto di utilizzare dati anonimi e aggregati per migliorare i propri
              servizi.
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">7. Limitazione di responsabilità</h3>
            <p>
              ZeusX fornisce il servizio &quot;as is&quot; senza garanzie esplicite o implicite. In nessun caso
              ZeusX sarà responsabile per danni diretti, indiretti, incidentali o consequenziali derivanti
              dall&apos;uso del servizio.
            </p>
          </section>

          <section className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-3">8. Modifiche ai termini</h3>
            <p>
              ZeusX si riserva il diritto di modificare questi termini e condizioni in qualsiasi momento.
              Le modifiche saranno comunicate agli utenti registrati e entreranno in vigore dopo 30 giorni
              dalla data di pubblicazione.
            </p>
          </section>
        </div>

        {/* CTA finale */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-4">Pronto a iniziare?</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition"
            >
              Inizia gratis
            </Link>
            <Link
              href="/"
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-4 rounded-xl transition"
            >
              Torna alla home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
