import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supporta i principali provider AI
async function callGroq(messages: Array<{role: string, content: string}>): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Errore Groq');
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(messages: Array<{role: string, content: string}>): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Errore OpenAI');
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouter(messages: Array<{role: string, content: string}>): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zeusx.app',
      'X-Title': 'ZeusX',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Errore OpenRouter');
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(messages: Array<{role: string, content: string}>): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  // Converti i messaggi in formato Gemini
  const prompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  const result = await model.generateContent(prompt);
  return result.response.text();
}

const SYSTEM_PROMPT = `Sei ZeusX AI, un assistente AI specializzato nella piattaforma ZeusX. 
Sei preparato, utile, creativo e conciso. Puoi aiutare gli utenti a:
- Capire come funziona ZeusX
- Creare applicazioni SaaS tramite il generatore AI
- Rispondere a domande tecniche e di business
- Fornire consigli su sviluppo e best practices

Rispondi sempre in italiano a meno che non richiesto espressamente in un'altra lingua.`;

// Chiama un provider AI a pagamento con le chiavi del proprietario del sito:
// senza autenticazione chiunque conoscesse l'URL potrebbe consumare budget
// illimitato (nessun rate limiting è configurato su questo endpoint).
async function requireAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && !!user;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, provider = 'groq' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        error: 'Messaggi richiesti' 
      }, { status: 400 });
    }

    // Prendi l'ultimo messaggio dell'utente
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      return NextResponse.json({ 
        error: 'Nessun messaggio utente trovato' 
      }, { status: 400 });
    }

    // Aggiungi il system prompt se non è già presente
    const allMessages = messages[0]?.role === 'system' 
      ? messages 
      : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

    let reply: string;

    try {
      if (provider === 'openai') {
        reply = await callOpenAI(allMessages);
      } else if (provider === 'openrouter') {
        reply = await callOpenRouter(allMessages);
      } else if (provider === 'gemini') {
        reply = await callGemini(allMessages);
      } else {
        // Default: Groq
        reply = await callGroq(allMessages);
      }
    } catch (err: any) {
      console.error('AI Provider error:', err);
      return NextResponse.json({ 
        error: err.message || 'Errore nel provider AI' 
      }, { status: 500 });
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json({ 
      error: err.message || 'Errore interno del server' 
    }, { status: 500 });
  }
}
