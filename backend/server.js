const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = 5005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/vision/analyze', async (req, res) => {
    try {
        const { prompt, image } = req.body;
        console.log("Richiesta ricevuta!");

        const intent = await groq.chat.completions.create({
            messages: [{ role: "user", content: `L'utente ha chiesto: '${prompt}'. Rispondi solo 'IMAGE' o 'CHAT'.` }],
            model: "llama-3.3-70b-versatile"
        });
        const decision = intent.choices[0].message.content.trim().toUpperCase();

        if (decision.includes('IMAGE')) {
            const response = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
                method: "POST",
                headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: prompt })
            });
            const buffer = await response.arrayBuffer();
            return res.json({ reply: "Immagine generata:", image: `data:image/png;base64,${Buffer.from(buffer).toString('base64')}` });
        } else {
            if (image) {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent([prompt || "Analizza:", { inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } }]);
                return res.json({ reply: result.response.text(), image: null });
            } else {
                const chat = await groq.chat.completions.create({ messages: [{ role: "user", content: prompt }], model: "llama-3.3-70b-versatile" });
                return res.json({ reply: chat.choices[0].message.content, image: null });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server attivo su porta ${PORT}`));