"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../utils/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function QuestionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const [question, setQuestion] = useState<{ question_text: string; answer_text: string | null } | null>(null);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<{ id: string; comment_text: string; user_id: string; created_at: string }[]>([]);

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
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('question_id', id);

            if (error) {
                console.error('Error fetching comments:', error);
            } else {
                setComments(data);
            }
        };

        fetchQuestion();
        fetchComments();
    }, [id]);

    const handleCommentSubmit = async () => {
        if (!commentText) return;

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
            console.error('Error fetching session:', sessionError);
            return;
        }

        const userId = sessionData.session.user.id;

        const { data, error } = await supabase
            .from('comments')
            .insert([{ question_id: id, user_id: userId, comment_text: commentText }]);

        if (error) {
            console.error('Error adding comment:', error);
        } else {
            setComments([...comments, ...(data || [])]);
            setCommentText('');
        }
    };

    if (!question) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>質問詳細</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col space-y-2">
                        <div className="self-end bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                            <strong>質問:</strong> {question.question_text}
                        </div>
                        <div className="self-start bg-gray-200 p-3 rounded-lg max-w-xs">
                            <strong>回答:</strong> {question.answer_text || '未回答'}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">コメント</h2>
                <ul className="space-y-4">
                    {comments.map((comment) => (
                        <li key={comment.id} className="card">
                            <p>{comment.comment_text}</p>
                            <small>{new Date(comment.created_at).toLocaleString()}</small>
                        </li>
                    ))}
                </ul>
                <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="コメントを入力してください"
                    className="w-full p-2 border rounded mt-4"
                />
                <Button
                    onClick={handleCommentSubmit}
                    className="w-full mt-2"
                >
                    コメントを送信
                </Button>
            </div>
            <Button 
                onClick={() => router.back()}
                className="w-full mt-4 bg-red-500 text-white"
            >
                戻る
            </Button>
        </div>
    );
} 