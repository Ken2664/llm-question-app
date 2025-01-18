import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { question, model, courseName } = req.body;

    // リクエストの検証
    if (!question || !model || !courseName) {
        return res.status(400).json({ 
            error: '必要なパラメータが不足しています。question, model, courseNameは必須です。' 
        });
    }

    // API KEYの検証
    if (model === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
        return res.status(500).json({ error: 'DEEPSEEK_API_KEYが設定されていません' });
    }

    if (model === 'gemini' && !process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEYが設定されていません' });
    }

    try {
        let textResponse;

        if (model === 'deepseek') {
            const deepSeek = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: process.env.DEEPSEEK_API_KEY,
            });

            const completion = await deepSeek.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: `あなたは${courseName}の教授です。生徒の質問に対してstep-by-stepで考えて親切に教えて下さい。` 
                    },
                    { 
                        role: "user", 
                        content: question 
                    }
                ],
                model: "deepseek-chat",
            });
            textResponse = completion.choices[0].message.content;
        } else {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
            const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp" });
            
            const result = await aiModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: question }] }],
            });

            textResponse = result.response.text();
        }

        if (!textResponse) {
            return res.status(500).json({ error: 'AIモデルからの応答がありません' });
        }

        return res.status(200).json({ answer: textResponse });
    } catch (error) {
        console.error("Error generating AI response:", error);
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'AIレスポンスの生成中にエラーが発生しました'
        });
    }
}