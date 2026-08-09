// هذا الملف بيشتغل على سيرفر Vercel نفسه، مش على متصفح المستخدم.
// عشان كده مفتاح الـ API بيفضل مخبّى وآمن، ومحدش يقدر يشوفه أو يسرقه.
//
// بيستخدم Google Gemini (باقة مجانية متجددة يوميًا)، وبيرجّع الرد بنفس شكل
// رد Claude عشان كود الموقع (index.html) يفضل شغال من غير أي تعديل فيه.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  try {
    const { prompt, system } = req.body || {};
    if (!prompt) {
      res.status(400).json({ error: { message: "Missing prompt" } });
      return;
    }

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );

    const data = await apiRes.json();

    if (!apiRes.ok) {
      res.status(apiRes.status).json({ error: { message: (data && data.error && data.error.message) || "Gemini API error" } });
      return;
    }

    const candidate = (data.candidates || [])[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts.map((p) => p.text || "").join("");
    const finishReason = candidate && candidate.finishReason;

    // نعيد تشكيل الرد بنفس بنية رد Claude، عشان الواجهة تفضل شغالة زي ما هي
    res.status(200).json({
      content: [{ type: "text", text }],
      stop_reason: finishReason === "MAX_TOKENS" ? "max_tokens" : "end_turn",
    });
  } catch (e) {
    res.status(500).json({ error: { message: e.message || "server error" } });
  }
};
