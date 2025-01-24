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
                    { role: "system", content: `Think in English and answer in Japanese.あなたは${courseName}の教授です。生徒の質問に対してstep-by-stepで考えて親切に教えて下さい。` },
                    { role: "user", content: `{propmpt}{role description}${courseName}に対する深い知識を持った教授{/role description}{task}与えられたquestionの内容に対して${courseName}の教授としての立場から、questionに対してstep-by-stepで分析して答えてください。{/task}{conditions}・Think in English and answer in Japanese.・質問の内容に対して完全に回答してください。・質問が答えを求めている場合は、正しく答えを教えてください。・答えるときは、step-by-stepの思考手順を簡潔に解説しながら説明してください。・数学や理系科目の説明の際は可能な限り数式を用いて説明するようにしてください。{/conditions}{response conditions}・日本語で回答を出力してください・数式を表示する時はMarkdownとTeXを組み合わせて出力してください。・読みやすく段落分けされた回答をMarkdownを用いて出力してください。{/response conditions}{question}${question}{/question}{/prompt}` }
                ],

                model: "deepseek-reasoner",
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