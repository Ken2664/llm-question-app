"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface Question {
    id: string;
    question_text: string;
}

export default function MyPage() {
    const [user, setUser] = useState<User | null>(null);
    const [unresolvedQuestions, setUnresolvedQuestions] = useState<Question[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };

        getSession();
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchUnresolvedQuestions = async () => {
            const { data, error } = await supabase
                .from('questions')
                .select('id, question_text')
                .eq('user_id', user.id)
                .eq('solved', false);

            if (error) {
                console.error('Error fetching unresolved questions:', error);
            } else {
                setUnresolvedQuestions(data as Question[]);
            }
        };

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('comments')
                .select('question_id')
                .in('question_id', unresolvedQuestions.map(q => q.id));

            if (error) {
                console.error('Error fetching notifications:', error);
            } else {
                setNotifications(data.map((comment: any) => comment.question_id));
            }
        };

        fetchUnresolvedQuestions();
        fetchNotifications();
    }, [user, unresolvedQuestions]);

    return (
        <div className="container mx-auto p-6 bg-white shadow-md rounded-lg">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">マイページ</h1>
            <div className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-gray-700">お知らせ</h2>
                {notifications.length > 0 ? (
                    <ul className="space-y-4">
                        {unresolvedQuestions.map((question) => (
                            notifications.includes(question.id) && (
                                <li key={question.id} className="border p-4 rounded-lg hover:bg-gray-100 transition">
                                    <Link href={`/question/${question.id}`} className="block text-lg text-blue-600 hover:underline">
                                        <strong>質問:</strong> {question.question_text}
                                    </Link>
                                </li>
                            )
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-600">新しいコメントはありません。</p>
                )}
            </div>
            <div className="flex space-x-4">
                <Link
                    href="/"
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                    トップページに戻る
                </Link>
                <Link
                    href="/profile"
                    className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition"
                >
                    プロフィールを更新
                </Link>
            </div>
        </div>
    );
} 