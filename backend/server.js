require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || "");

const app = express();
const PORT = 5005;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");

// Middleware di autenticazione: valida il JWT Supabase
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token di autenticazione mancante" });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  req.user = user;
  next();
};

// Helper per gestire l'errore 503 di Google
const handleGeminiError = (error, res) => {
  console.error("ERRORE GEMINI DETTAGLIATO:", error);
  
  const is503 = error.message.includes('503') || error.status === 503;
  
  if (is503) {
    return res.status(503).json({ error: "Il modello è temporaneamente sovraccarico (503)." });
  }
  return res.status(500).json({ error: "Errore dal server AI: " + error.message });
};

// Endpoint Vision (protetto)
app.post('/api/vision/analyze', requireAuth, async (req, res) => {
  const { image, prompt } = req.body;
  if (!image) return res.status(400).json({ error: "Immagine mancante" });

  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const mimeType = image.match(/data:(image\/[a-zA-Z]+);base64,/)?.[1] || "image/jpeg";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      prompt || "Descrivi questa immagine in dettaglio.",
      { inlineData: { data: base64Data, mimeType: mimeType } },
    ]);

    return res.json({ reply: result.response.text() });
  } catch (error) {
    handleGeminiError(error, res);
  }
});

// Endpoint Chat (protetto, userId estratto dal JWT)
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(message);
    const reply = result.response.text();
    
    await supabase.from('messages').insert([
      { chat_id: userId, role: 'user', content: message }, 
      { chat_id: userId, role: 'assistant', content: reply }
    ]);

    return res.json({ reply });
  } catch (err) {
    handleGeminiError(err, res);
  }
});

// Endpoint Storico (protetto, userId estratto dal JWT)
app.get('/api/chat/history', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint Stripe Checkout (protetto)
app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
  const { priceId } = req.query;
  if (!priceId) return res.status(400).json({ error: "priceId mancante" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
      customer_email: req.user.email,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Errore Stripe:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server operativo su http://localhost:${PORT}`);
});
