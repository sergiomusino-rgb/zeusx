'use client';

export default function PricingPage() {
  const plans = [
    { name: 'FREE', price: '0', desc: 'Con pubblicità', id: null },
    { name: 'PRO', price: '29,99', desc: 'Crediti limitati', id: 'price_1TkomdRZR2YaFu2sAgrK3et9' },
    { name: 'VIP', price: '99,99', desc: 'Crediti illimitati', id: 'price_1TkonxRZR2YaFu2shjm0yOjd' },
  ];

  const handleUpgrade = async (priceId: string | null) => {
    if (!priceId) return alert("Sei già nel piano Free!");

    try {
      // Usiamo la query string per evitare problemi di parsing del body
      const res = await fetch(`http://localhost:5005/api/create-checkout-session?priceId=${priceId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert("Errore: " + (data.error || "Sessione non creata"));
      }
    } catch (err) {
      console.error("Errore di rete:", err);
      alert("Errore di connessione al server.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-12">
      <h1 className="text-4xl font-bold text-center mb-16">Piani ZEUSX</h1>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.name} className="border border-slate-800 p-8 rounded-2xl bg-slate-900 text-center">
            <h2 className="text-2xl font-black">{plan.name}</h2>
            <div className="text-4xl font-bold my-6">€{plan.price}<span className="text-sm font-normal">/mese</span></div>
            <p className="text-slate-400 mb-8">{plan.desc}</p>
            <button 
              onClick={() => handleUpgrade(plan.id)}
              className={`w-full py-3 rounded-xl font-bold transition-all ${plan.id ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800'}`}
            >
              {plan.id ? 'Attiva Piano' : 'Piano Attuale'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}