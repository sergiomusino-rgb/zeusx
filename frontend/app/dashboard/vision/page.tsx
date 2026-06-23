"use client";
import { useState, useRef } from 'react';

export default function VisionPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("In attesa di input...");
  const [serverImage, setServerImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // INSERISCI QUI IL TUO URL PUBBLICO (ES: https://xxxxx-5005.app.github.dev)
  const BACKEND_URL =  "https://vigilant-adventure-p7jq5j65p97w3gvw-5005.app.github.dev";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult("Elaborando con l'AI...");
    setServerImage(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/vision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image: previewImage })
      });
      const data = await response.json();
      setResult(data.reply);
      if (data.image) setServerImage(data.image);
    } catch (e) {
      setResult("Errore: Impossibile raggiungere il backend. Verifica che la porta 5005 sia Public.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <textarea className="w-full bg-gray-900 p-3 rounded mb-4" rows={4} onChange={(e) => setPrompt(e.target.value)} placeholder="Scrivi il tuo comando..." />
          <input type="file" onChange={handleFileChange} className="mb-4" />
          {previewImage && <img src={previewImage} className="w-32 mb-4 rounded" alt="Preview" />}
          <button className="w-full bg-blue-600 py-2 rounded" onClick={handleSubmit} disabled={loading}>
            {loading ? "Caricamento..." : "Invia"}
          </button>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="mb-4 text-gray-300">{result}</div>
          {serverImage && <img src={serverImage} className="w-full rounded" alt="Risultato" />}
        </div>
      </div>
    </div>
  );
}