export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: '⚠️ GROQ_API_KEY is not set in Vercel environment variables. Go to Vercel → Project → Settings → Environment Variables and add it.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are Noor, a warm and knowledgeable Islamic assistant. Answer questions about Islam, Ramadan, prayer, Quran, and general topics with care. Keep responses concise and friendly.',
          },
          ...messages.filter(m => m.role === 'user' || m.role === 'assistant'),
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    // Pass the real error back to the frontend
    if (!response.ok) {
      const errBody = await response.text();
      let errMsg;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed?.error?.message || errBody;
      } catch {
        errMsg = errBody;
      }
      console.error('Groq API error:', response.status, errMsg);
      return res.status(502).json({ error: `Groq error (${response.status}): ${errMsg}` });
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected Groq response shape:', JSON.stringify(data));
      return res.status(502).json({ error: `Unexpected response from Groq: ${JSON.stringify(data)}` });
    }

    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (err) {
    console.error('Chat handler exception:', err);
    res.status(500).json({ error: `Server exception: ${err.message}` });
  }
}
