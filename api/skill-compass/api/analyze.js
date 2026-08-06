export default async function handler(req, res) {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await apiResponse.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || candidate?.output || JSON.stringify(data);
    
    return res.status(200).json({ result: text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}