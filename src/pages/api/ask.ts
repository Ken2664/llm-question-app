import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { question } = req.body;

        console.log('Received question:', question);

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent(question);
            console.log('Full AI response:', JSON.stringify(result, null, 2)); // Full ResponseをJSONで出力

            // 修正: text() を呼び出す
            const textResponse = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || null;

            if (!textResponse) {
                console.error('Invalid or empty response text:', result);
                return res.status(500).json({ error: 'No text response from AI model' }); // 明示的にreturn
            }

            res.status(200).json({ answer: textResponse });
        } catch (error) {
            console.error("Error generating AI response:", error);
            res.status(500).json({ error: (error as Error).message || 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}