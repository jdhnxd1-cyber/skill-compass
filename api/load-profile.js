// Vercel serverless function: /api/load-profile?email=...
// Reads a student's saved profile from Supabase.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'إعدادات Supabase غير مكتملة على السيرفر.' });
  }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'إيميل غير صالح.' });
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/students?email=eq.${encodeURIComponent(email)}&select=payload`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    );
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText || ('HTTP ' + resp.status));
    }
    const rows = await resp.json();
    if (!rows.length) {
      return res.status(404).json({ error: 'مفيش بيانات محفوظة بالإيميل ده.' });
    }
    return res.status(200).json(rows[0].payload);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'تعذّر الاسترجاع.' });
  }
}
