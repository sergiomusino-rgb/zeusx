'use client';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CheckoutPage() {
  const priceId = 'price_1TkomdRZR2YaFu2sAgrK3et9'; // Sostituisci con l'ID dinamico se necessario

  const handleUpgrade = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`https://zeusx-backend.onrender.com/api/create-checkout-session?priceId=${priceId}`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert("Errore: " + (data.error || "Sessione non creata"));
      }
    } catch (err) {
      console.error("Errore:", err);
      alert("Errore di connessione al server.");
    }
  };

  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-bold mb-6">Completa il tuo abbonamento</h1>
      <button 
        onClick={handleUpgrade}
        className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-blue-700"
      >
        Paga ora
      </button>
    </div>
  );
}