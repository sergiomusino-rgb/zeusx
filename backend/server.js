require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 5005;

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");

// Helper per gestire l'errore 503 di Google
const handleGeminiError = (error, res) => {
  console.error("ERRORE GEMINI DETTAGLIATO:", error);
  
  // Controlla se l'errore è un 503 (sovrapposizione di stringhe o status code)
  const is503 = error.message.includes('503') || error.status === 503;
  
  if (is503) {
    return res.status(503).json({ error: "Il modello è temporaneamente sovraccarico (503)." });
  }
  return res.status(500).json({ error: "Errore dal server AI: " + error.message });
};

// Endpoint Vision
app.post('/api/vision/analyze', async (req, res) => {
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

// Endpoint Chat
app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(message);
    const reply = result.response.text();
    
    if (userId) {
        await supabase.from('messages').insert([
            { chat_id: userId, role: 'user', content: message }, 
            { chat_id: userId, role: 'assistant', content: reply }
        ]);
    }
    return res.json({ reply });
  } catch (err) {
    handleGeminiError(err, res);
  }
});

// Endpoint Storico
app.get('/api/chat/history', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "UserId mancante" });

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

app.listen(PORT, () => {
  console.log(`🚀 Server operativo su http://localhost:${PORT}`);
});