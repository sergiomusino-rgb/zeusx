import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt, lang } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const systemInstruction = `Sei l'architetto di ZeusX. Genera SOLO un oggetto JSON valido basato su questo prompt: "${prompt}".
    Lingua: ${lang}. 
    Schema obbligatorio (NON aggiungere altro testo):
    { 
      "appName": "string", 
      "schema": { "fields": [{ "id": "string", "type": "string", "label": "string" }] } 
    }`;

    const result = await model.generateContent(systemInstruction);
    const text = result.response.text();

    // PULIZIA: Rimuove eventuali blocchi markdown ```json ...```
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Errore nella generazione dell'app";
    console.error("Errore generate-app:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
