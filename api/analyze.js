import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { university, courses, lang } = req.body;

  const prompt = `
    أنت خبير توجيه مهني وتحليل مناهج أكاديمية متقدم.
    اسم الكلية والجامعة: ${university}
    المواد والمقررات الدراسية المدخلة: ${courses}
    اللغة المطلوبة للتقرير: ${lang === 'ar' ? 'العربية' : 'الانجليزية'}

    قم بتقديم تحليل مهني مخصص وفريد تماماً بناءً على الكلية والمواد المحددة أعلاه، ونسّق الرد في كود HTML مباشر (استخدم عناصر div, h3, p, ul, li) بدون أي رموز Markdown:

    1. قسم الكلية والجاهزية: عرض اسم الكلية وتحديد نسبة الجاهزية الحقيقية لسوق العمل بالأرقام (مثال: 75%).
    2. قسم الفجوات المهارية والمقترحات: استخراج 2 إلى 3 فجوات مهارية محددة لهذه المواد ومقترحات سدها.
    3. قسم الفرص الوظيفية والتدريبية (Internships): ترشيح وظيفتين أو تدريبين مناسبين للتخصص المذكور مع تحديد نسبة التطابق والمهارات المطلوبة لكل وظيفة.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    res.status(200).json({ resultHtml: responseText });
  } catch (error) {
    res.status(500).json({ error: "خطأ في تحليل البيانات بواسطة AI" });
  }
}
