// Vercel serverless function: /api/recommend
// Calls Google's Gemini API server-side so the API key never reaches the browser.
// Requires the environment variable GEMINI_API_KEY to be set in the Vercel project settings.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY غير مضبوط على السيرفر.' });
  }

  const {
    university = '', college = '', department = '',
    year = '', graduated = false,
    courses = '', fileText = ''
  } = req.body || {};

  if (!university || !college || !department) {
    return res.status(400).json({ error: 'بيانات الجامعة/الكلية/القسم ناقصة.' });
  }

  const yearInfo = graduated ? 'خريج بالفعل' : ('في السنة الدراسية رقم ' + year);
  const subjectsInfo = [
    courses ? ('المواد المكتوبة: ' + courses) : '',
    fileText ? ('محتوى من الملف المرفوع: ' + String(fileText).slice(0, 4000)) : ''
  ].filter(Boolean).join('\n');

  const systemPrompt = `أنت مستشار تطوير مهني ومسارات تعليمية خبير بسوق العمل في مصر والمنطقة العربية.
بناءً على بيانات الطالب، رشّح له خطة عملية.
رد بصيغة JSON فقط، بدون أي نص أو Markdown قبله أو بعده، وبالمفاتيح دي بالظبط:
{"roadmap_years":"نص قصير","courses":[{"name":"","provider":"","accredited":true}],"certificates":[{"name":"","provider":"","accredited":true}],"training_places":[{"name":"","type":"","note":""}],"market_needs":"فقرة قصيرة (2-3 جمل)","cv_tips":["","",""]}
اكتب 4 إلى 5 عناصر في courses، وفي certificates، وفي training_places. اكتب 3 إلى 4 عناصر في cv_tips. كل النصوص عربي، دقيقة ومفيدة، بدون حشو.`;

  const userPrompt = `الجامعة: ${university}
الكلية: ${college}
القسم: ${department}
الحالة: ${yearInfo}
${subjectsInfo}

رشّح كورسات، شهادات، أماكن تدريب، احتياجات السوق، ونصائح CV بناءً على البيانات دي.`;

  try {
  const modelName = "gemini-1.5-flash";
   // عدّل الاسم هنا لو ظهر إصدار أحدث في Google AI Studio
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1800,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      throw new Error((data.error && data.error.message) || ('HTTP ' + geminiRes.status));
    }

    const candidate = data.candidates && data.candidates[0];
    const text = candidate && candidate.content && candidate.content.parts
      ? candidate.content.parts.map(p => p.text || '').join('\n')
      : '';

    if (!text) {
      throw new Error('لم يصل رد نصي من Gemini.');
    }

    const parsed = parseJsonLenient(text);
    if (!parsed) {
      throw new Error('تعذّر فهم رد Gemini كـJSON.');
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'حصل خطأ غير متوقع.' });
  }
}

// Lenient JSON parser: auto-closes brackets if the model's reply got cut off.
function parseJsonLenient(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  let str = cleaned.slice(start);
  try { return JSON.parse(str); } catch (e) { /* fall through */ }

  let depth = [];
  let inString = false, escape = false, lastSafe = -1;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escape) { escape = false; }
      else if (ch === '\\') { escape = true; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { depth.push(ch); }
    else if (ch === '}' || ch === ']') { depth.pop(); }
    if (!inString && (ch === ',' || ch === '{' || ch === '[')) lastSafe = i;
  }
  if (inString) {
    str = str.slice(0, lastSafe + 1);
    depth = [];
    inString = false; escape = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (inString) {
        if (escape) { escape = false; } else if (ch === '\\') { escape = true; } else if (ch === '"') { inString = false; }
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{' || ch === '[') { depth.push(ch); }
      else if (ch === '}' || ch === ']') { depth.pop(); }
    }
  }
  str = str.replace(/,\s*$/, '');
  for (let i = depth.length - 1; i >= 0; i--) {
    str += depth[i] === '{' ? '}' : ']';
  }
  try { return JSON.parse(str); } catch (e) { return null; }
}
