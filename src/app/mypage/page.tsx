"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Home, UserCircle, BookOpen, Check } from 'lucide-react';
import { LoadingSpinner } from "@/components/ui/loading";

interface Question {
    id: string;
    question_text: string;
}

export default function MyPage() {
    const [user, setUser] = useState<User | null>(null);
    const [unresolvedQuestions, setUnresolvedQuestions] = useState<Question[]>([]);
    const [notifications, setNotifications] = useState<string[]>([]);
    const [isTeacher, setIsTeacher] = useState(false);
    const [loading, setLoading] = useState(true);

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
            setLoading(false);
        };

        getSession();
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

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
                    .in('question_id', questionIds)
                    .eq('read', false);

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

    const markAsRead = async (questionId: string) => {
        // commentsテーブルのreadをTRUEに更新
        const { error: commentsError } = await supabase
            .from('comments')
            .update({ read: true })
            .eq('question_id', questionId)
            .eq('read', false);

        if (commentsError) {
            console.error('コメントの既読化エラー:', commentsError);
            return;
        }

        // questionsテーブルのsolvedをTRUEに更新
        const { error: questionsError } = await supabase
            .from('questions')
            .update({ solved: true })
            .eq('id', questionId)
            .eq('solved', false);

        if (questionsError) {
            console.error('質問の解決化エラー:', questionsError);
            return;
        }

        // 既読にした質問IDを通知リストから削除
        setNotifications((prev) => prev.filter(id => id !== questionId));
        // コメントを再度フェッチ
        fetchData();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center">
                        <UserCircle className="mr-2" />
                        マイページ
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold flex items-center">
                                <Bell className="mr-2" /> お知らせ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {notifications.length > 0 ? (
                                <ul className="space-y-4">
                                    {unresolvedQuestions.map((question) => (
                                        notifications.includes(question.id) && (
                                            <li key={question.id} className="border p-4 rounded-lg hover:bg-gray-100 transition flex justify-between items-center">
                                                <Link href={`/question/${question.id}`} className="block text-lg text-blue-600 hover:underline">
                                                    <strong>質問:</strong> {question.question_text}
                                                </Link>
                                                <Button onClick={() => markAsRead(question.id)} className="ml-4 border border-gray-300 rounded px-4 py-2 hover:bg-gray-200 transition">
                                                    既読にする
                                                </Button>
                                            </li>
                                        )
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-600">新しいコメントはありません。</p>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                        <Button asChild variant="outline" className="w-full sm:w-auto">
                            <Link href="/">
                                <Home className="mr-2" /> トップページに戻る
                            </Link>
                        </Button>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/profile">
                                <UserCircle className="mr-2" /> プロフィールを更新
                            </Link>
                        </Button>
                        {isTeacher && (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href="/teacher">
                                    <BookOpen className="mr-2" /> 教員用ページ
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

