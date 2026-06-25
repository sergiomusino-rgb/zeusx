require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 5005;

// Configurazione CORS: in produzione limitare ai domini consentiti
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} non autorizzato`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(helmet());

// Webhook Stripe DEVE usare raw body, quindi lo registriamo prima di express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), require('./routes/stripe'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Client AI inizializzati solo se le chiavi sono presenti
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Helper: risposta con modello non inizializzato
function clientMissing(res, provider) {
  return res.status(503).json({ error: `${provider} non configurato. Aggiungi la chiave API.` });
}

// --- HEALTH CHECK ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- CHAT API ---
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider = 'groq', model } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array richiesto' });
    }

    const content = messages[messages.length - 1]?.content || '';

    if (provider === 'groq') {
      if (!groq) return clientMissing(res, 'Groq');
      const chatModel = model || 'llama-3.3-70b-versatile';
      const completion = await groq.chat.completions.create({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        model: chatModel
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    if (provider === 'gemini') {
      if (!genAI) return clientMissing(res, 'Gemini');
      const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-2.0-flash' });
      const result = await geminiModel.generateContent(content);
      return res.json({ reply: result.response.text() });
    }

    if (provider === 'openai') {
      if (!openai) return clientMissing(res, 'OpenAI');
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    if (provider === 'anthropic') {
      if (!anthropic) return clientMissing(res, 'Anthropic');
      const msg = await anthropic.messages.create({
        model: model || 'claude-3-5-sonnet-20240620',
        max_tokens: 2048,
        messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
      });
      return res.json({ reply: msg.content.map(c => c.type === 'text' ? c.text : '').join('') });
    }

    return res.status(400).json({ error: `Provider ${provider} non supportato` });
  } catch (err) {
    console.error('/api/chat error:', err);
    res.status(500).json({ error: err.message || 'Errore interno' });
  }
});

// --- VISION API ---
app.post('/api/vision/analyze', async (req, res) => {
  try {
    const { prompt, image, provider = 'groq', model } = req.body;
    if (!image) return res.status(400).json({ error: 'Immagine richiesta' });

    const base64Image = image.includes(',') ? image.split(',')[1] : image;
    const mimeType = image.includes('data:image/png') ? 'image/png' : 'image/jpeg';

    if (provider === 'groq') {
      if (!groq) return clientMissing(res, 'Groq');
      const visionModel = model || 'meta-llama/llama-4-scout-17b-16e-instruct';
      const completion = await groq.chat.completions.create({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Descrivi questa immagine dettagliatamente.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ]
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    if (provider === 'gemini') {
      if (!genAI) return clientMissing(res, 'Gemini');
      const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
      const result = await geminiModel.generateContent([
        prompt || 'Descrivi questa immagine.',
        { inlineData: { data: base64Image, mimeType } }
      ]);
      return res.json({ reply: result.response.text() });
    }

    if (provider === 'openai') {
      if (!openai) return clientMissing(res, 'OpenAI');
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Descrivi questa immagine.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ]
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    return res.status(400).json({ error: `Provider ${provider} non supportato per vision` });
  } catch (err) {
    console.error('/api/vision/analyze error:', err);
    res.status(500).json({ error: err.message || 'Errore vision' });
  }
});

// --- GENERATE APP BLUEPRINT ---
app.post('/api/generate-app', async (req, res) => {
  try {
    const { sector, tenantId } = req.body;
    if (!sector) return res.status(400).json({ error: 'Settore richiesto' });

    const provider = process.env.PREFERRED_AI_PROVIDER || 'groq';
    const prompt = `Sei un architetto software. Genera un blueprint JSON per un gestionale SaaS per il settore "${sector}".
Il JSON deve contenere:
- name: nome dell'app
- sector: settore normalizzato
- description: descrizione breve
- schema: { tables: [{ name, columns: [{ name, type, required, label }] }] }
- ui: { pages: [{ name, route, components: [...] }] }
Rispondi SOLO con il JSON valido, senza testo aggiuntivo.`;

    let raw = '';

    if (provider === 'groq' && groq) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }]
      });
      raw = completion.choices[0].message.content;
    } else if (provider === 'openai' && openai) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      });
      raw = completion.choices[0].message.content;
    } else if (provider === 'gemini' && genAI) {
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await geminiModel.generateContent(prompt);
      raw = result.response.text();
    } else {
      return res.status(503).json({ error: 'Nessun provider AI disponibile' });
    }

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const blueprint = JSON.parse(jsonMatch[1].trim());

    return res.json({ blueprint, tenantId });
  } catch (err) {
    console.error('/api/generate-app error:', err);
    res.status(500).json({ error: err.message || 'Errore generazione blueprint' });
  }
});

// --- STRIPE ROUTES (escluso webhook già montato sopra) ---
app.use('/api', require('./routes/stripe'));

// --- ERROR HANDLER ---
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Errore interno del server' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ZeusX backend attivo su http://0.0.0.0:${PORT}`);
});
