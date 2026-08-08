// Vercel serverless function: /api/save-profile
// Upserts the student's profile into Supabase. Requires SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY to be set in the Vercel project's environment variables.
// Run this SQL once in your Supabase project's SQL editor to create the table:
//
//   create table students (
//     email text primary key,
//     payload jsonb not null,
//     saved_at timestamptz default now()
//   );

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'إعدادات Supabase غير مكتملة على السيرفر.' });
  }

  const { email, payload } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !payload) {
    return res.status(400).json({ error: 'بيانات غير صالحة.' });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{
        email: email.trim().toLowerCase(),
        payload,
        saved_at: new Date().toISOString()
      }])
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText || ('HTTP ' + resp.status));
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'تعذّر الحفظ.' });
  }
}
