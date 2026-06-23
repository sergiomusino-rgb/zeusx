'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5005';

export default function CheckoutPage() {
  const priceId = 'price_1TkomdRZR2YaFu2sAgrK3et9';
  const router = useRouter();

  const handleUpgrade = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/create-checkout-session?priceId=${priceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.assign(data.url);
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
