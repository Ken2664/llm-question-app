"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../utils/supabaseClient';

export default function QuestionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const [question, setQuestion] = useState<{ question_text: string; answer_text: string | null } | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchQuestion = async () => {
            const { data, error } = await supabase
                .from('questions')
                .select('question_text, answer_text')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching question:', error);
            } else {
                setQuestion(data);
            }
        };

        fetchQuestion();
    }, [id]);

    if (!question) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">質問詳細</h1>
            <div className="flex flex-col space-y-2">
                <div className="self-end bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                    <strong>質問:</strong> {question.question_text}
                </div>
                <div className="self-start bg-gray-200 p-3 rounded-lg max-w-xs">
                    <strong>回答:</strong> {question.answer_text || '未回答'}
                </div>
            </div>
            <button 
                onClick={() => router.back()}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
                戻る
            </button>
        </div>
    );
} 