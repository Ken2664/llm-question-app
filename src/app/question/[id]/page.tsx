"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { LoadingSpinner } from '@/components/ui/loading';

export default function QuestionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const [question, setQuestion] = useState<{ question_text: string; answer_text: string | null } | null>(null);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<{ id: string; comment_text: string; user_id: string; created_at: string; role: string | null }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

        const fetchComments = async () => {
            const { data: commentsData, error: commentsError } = await supabase
                .from('comments')
                .select('id, comment_text, user_id, created_at')
                .eq('question_id', id)
                .order('created_at', { ascending: true });

            const { data: teachCommentsData, error: teachCommentsError } = await supabase
                .from('teach_comments')
                .select('id, comment_text, user_id, created_at')
                .eq('question_id', id)
                .order('created_at', { ascending: true });

            if (commentsError || teachCommentsError) {
                console.error('Error fetching comments:', commentsError || teachCommentsError);
            } else {
                const allComments = [...commentsData, ...teachCommentsData];

                // Fetch roles for each user
                const userIds = allComments.map(comment => comment.user_id);
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, role')
                    .in('id', userIds);

                if (usersError) {
                    console.error('Error fetching user roles:', usersError);
                } else {
                    const commentsWithRoles = allComments.map(comment => {
                        const user = usersData.find(user => user.id === comment.user_id);
                        return { ...comment, role: user?.role };
                    });

                    setComments(commentsWithRoles);
                }
            }
        };

        const fetchData = async () => {
            setIsLoading(true);
            await Promise.all([fetchQuestion(), fetchComments()]);
            setIsLoading(false);
        };

        fetchData();
    }, [id]);

    const handleCommentSubmit = async () => {
        if (!commentText) return;

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
            console.error('Error fetching session:', sessionError);
            return;
        }

        const userId = sessionData.session.user.id;

        // Check if the user is a teacher
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError || userData?.role !== 'teacher') {
            console.error('User is not a teacher or error fetching user role:', userError);
            return;
        }

        const { data, error } = await supabase
            .from('teach_comments')
            .insert([{ question_id: id, user_id: userId, comment_text: commentText }]);

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            setComments([...comments, ...(data || [])]);
            setCommentText('');
        }
    };

    if (isLoading) {
        return <LoadingSpinner size="lg" className="my-8" />;
    }

    if (!question) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">質問詳細</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col space-y-4">
                        <ChatMessage role="user" content={question.question_text} />
                        <ChatMessage role="assistant" content={question.answer_text || '未回答'} />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">コメント</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4 mb-4">
                        {comments.map((comment) => (
                            <li 
                                key={comment.id} 
                                className={`p-4 rounded-lg ${comment.role === 'teacher' ? 'bg-yellow-100' : 'bg-gray-100'}`}
                            >
                                <p className="mb-2">{comment.comment_text}</p>
                                <small className="text-gray-500">{new Date(comment.created_at).toLocaleString()}</small>
                            </li>
                        ))}
                    </ul>
                    <div className="space-y-4">
                        <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="コメントを入力してください"
                        />
                        <Button onClick={handleCommentSubmit} className="w-full">
                            <Send className="mr-2" /> コメントを送信
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <Button 
                onClick={() => router.back()}
                variant="outline"
                className="w-full mt-4"
            >
                <ArrowLeft className="mr-2" /> 戻る
            </Button>
        </div>
    );
}
