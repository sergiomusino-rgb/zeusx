'use client';

export default function CheckoutPage() {
  const priceId = 'price_1TkomdRZR2YaFu2sAgrK3et9'; // Sostituisci con l'ID dinamico se necessario

  const handleUpgrade = async () => {
    try {
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