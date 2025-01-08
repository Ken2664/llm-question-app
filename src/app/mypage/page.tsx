"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Home, UserCircle } from 'lucide-react';

interface Question {
    id: string;
    question_text: string;
}

export default function MyPage() {
    const [user, setUser] = useState<User | null>(null);
    const [unresolvedQuestions, setUnresolvedQuestions] = useState<Question[]>([]);
    const [notifications, setNotifications] = useState<string[]>([]);
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user role:', error);
                } else if (userData?.role === 'teacher') {
                    setIsTeacher(true);
                }
            }
        };

        getSession();
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            // 未解決の質問を取得
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('id, question_text')
                .eq('user_id', user.id)
                .eq('solved', false);

            if (questionsError) {
                console.error('未解決の質問の取得エラー:', questionsError);
            } else {
                const questions = questionsData as Question[];
                setUnresolvedQuestions(questions);

                // コメントが存在する質問IDを取得
                const questionIds = questions.map(q => q.id);
                if (questionIds.length > 0) {
                    const { data: commentsData, error: commentsError } = await supabase
                        .from('comments')
                        .select('question_id')
                        .in('question_id', questionIds);

                    if (commentsError) {
                        console.error('コメントの取得エラー:', commentsError);
                    } else {
                        const notifiedQuestionIds = (commentsData as any[]).map(comment => comment.question_id);
                        setNotifications(notifiedQuestionIds);
                    }
                } else {
                    setNotifications([]);
                }
            }
        };

        fetchData();
    }, [user]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">マイページ</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <Bell className="mr-2" /> お知らせ
                        </h2>
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
                        <Button asChild variant="outline">
                            <Link href="/">
                                <Home className="mr-2" /> トップページに戻る
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/profile">
                                <UserCircle className="mr-2" /> プロフィールを更新
                            </Link>
                        </Button>
                        {isTeacher && (
                            <Button asChild>
                                <Link href="/teacher">
                                    <UserCircle className="mr-2" /> 教員用ページ
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
