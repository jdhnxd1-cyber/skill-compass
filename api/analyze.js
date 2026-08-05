import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { university, courses, lang } = req.body;
        
        // جلب المفتاح من Environment Variables
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API Key is missing' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `أنت خبير توجيه مهني. قم بتحليل المواد التالية واقترح الوظائف والمهارات المطلوبة.
        الجامعة/التخصص: ${university}
        المواد الدراسية: ${courses}
        اللغة المطلوبة للرد: ${lang === 'en' ? 'English' : 'العربية'}`;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();

        return res.status(200).json({ result: responseText });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'خطأ في تحليل البيانات بواسطة AI', details: error.message });
    }
}
