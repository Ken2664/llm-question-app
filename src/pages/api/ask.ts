import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: true,
    // Vercelのタイムアウト制限を30秒に延長
    externalResolver: true,
  },
};

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

    // タイムアウトを30秒に設定
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=30');

    try {
        let textResponse;

        // タイムアウト付きのPromise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('APIリクエストがタイムアウトしました')), 25000);
        });

        if (model === 'deepseek') {
            const deepSeek = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: process.env.DEEPSEEK_API_KEY,
                timeout: 15000,
            });
            
            try {
                const completion = await deepSeek.chat.completions.create({
                    messages: [
                        { role: "system", content: `Think in English and answer in Japanese.あなたは${courseName}の教授です。生徒の質問に対してstep-by-stepで考えて親切に教えて下さい。` },
                        { role: "user", content: question }
                    ],
                    model: "deepseek-reasoner",
                });
                
                textResponse = completion.choices[0].message.content;
            } catch (error) {
                throw new Error(`DeepSeek API Error: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
        } else {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
                const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp" });
                
                const result = await aiModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: question }] }],
                });

                if (!result.response) {
                    throw new Error('Gemini APIからの応答が空です');
                }

                textResponse = result.response.text();
            } catch (error) {
                throw new Error(`Gemini API Error: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
        }

        if (!textResponse) {
            throw new Error('AIモデルからの応答が空です');
        }

        return res.status(200).json({ answer: textResponse });
    } catch (error) {
        console.error("Error generating AI response:", error);
        // エラーメッセージをより詳細に
        return res.status(500).json({ 
            error: error instanceof Error 
                ? `エラーが発生しました: ${error.message}` 
                : 'AIレスポンスの生成中に予期せぬエラーが発生しました'
        });
    }
}