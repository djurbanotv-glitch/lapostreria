const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'lapostreria123';

// Verificación del webhook de Meta
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    if (!message || message.type !== 'text') return;

    const from = message.from;
    const text = message.text.body;
    console.log(`Mensaje de ${from}: ${text}`);

    const respuesta = await preguntarClaude(text);
    await enviarMensaje(from, respuesta);
  } catch (err) {
    console.error('Error:', err.message);
  }
});

async function preguntarClaude(mensaje) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Eres el asistente virtual de La Postrería, una pastelería artesanal. 
Respondes en español, de forma amable, breve y útil.
Ayudas con: precios, pedidos, horarios, productos disponibles y consultas generales.
Si no sabes algo específico, ofreces comunicar con el equipo.
Horario: Lunes a Sábado 9am-8pm, Domingos 10am-6pm.`,
      messages: [{ role: 'user', content: mensaje }]
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    }
  );
  return response.data.content[0].text;
}

async function enviarMensaje(to, texto) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: texto }
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot corriendo en puerto ${PORT}`));
