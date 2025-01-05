"use client";
import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

type QuestionWithRelations = {
    id: number;
    question_text: string;
    answer_text: string | null;
    lecture: {
        id: number;
        date: string;
        course: {
            course_id: number;
            name: string;
            faculty: {
                faculty_id: number;
                name: string;
            }
        }
    }
}

function QuestionList({ questions }: { questions: { id: number; question_text: string; answer_text: string | null; solved: boolean }[] }) {
    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">質問一覧</h2>
            <ul className="space-y-4">
                {questions.map((q) => (
                    <li key={q.id} className="border p-4 rounded cursor-pointer">
                        <Link href={`/question/${q.id}`} legacyBehavior>
                            <a>
                                <strong>質問:</strong> {q.question_text}
                                <span style={{ marginLeft: '10px', color: q.solved ? '#4CAF50' : '#f44336' }}>
                                    {q.solved ? '✅' : '❌'}
                                </span>
                            </a>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [lectures, setLectures] = useState<{ id: number; number: number }[]>([]);
    const [questions, setQuestions] = useState<{ id: number; question_text: string; answer_text: string | null; solved: boolean }[]>([]);
    const [faculties, setFaculties] = useState<{ faculty_id: number; name: string }[]>([]);
    const [courses, setCourses] = useState<{ course_id: number; name: string }[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [selectedLectureDate, setSelectedLectureDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const fetchLectures = async () => {
            const { data, error } = await supabase
                .from('lectures')
                .select('*');
            if (error) console.error('Error fetching lectures:', error);
            else setLectures(data);
        };

        fetchLectures();
    }, []);

    useEffect(() => {
        const fetchFaculties = async () => {
            const { data, error } = await supabase.from('faculties').select('faculty_id, name');
            if (error) console.error('Error fetching faculties:', error);
            else setFaculties(data || []);
        };

        const fetchCourses = async () => {
            const { data, error } = await supabase.from('courses').select('course_id, name');
            if (error) console.error('Error fetching courses:', error);
            else setCourses(data || []);
        };

        fetchFaculties();
        fetchCourses();
    }, []);

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) console.error('Error logging in:', error.message);
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error.message);
    };

    const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let query = supabase
            .from('questions')
            .select(`
                *,
                lectures!inner (
                    id,
                    date,
                    courses!inner (
                        course_id,
                        name,
                        faculties!inner (
                            faculty_id,
                            name
                        )
                    )
                )
            `);

        if (selectedFaculty) {
            query = query.eq('lectures.courses.faculties.faculty_id', selectedFaculty);
        }
        if (selectedCourse) {
            query = query.eq('lectures.courses.course_id', selectedCourse);
        }
        if (selectedLectureDate) {
            query = query.eq('lectures.date', selectedLectureDate);
        }
        if (searchQuery) {
            query = query.ilike('question_text', `%${searchQuery}%`);
        }
        if (showUnsolvedOnly) {
            query = query.eq('solved', false);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error searching questions:', error);
        } else {
            setQuestions(data.map(q => ({
                id: q.id,
                question_text: q.question_text,
                answer_text: q.answer_text,
                solved: q.solved
            })));
        }
    };

    return (
        <div className="container">
            <h1 className="text-2xl font-bold mb-4">LLM質問応答アプリケーション</h1>
            {!user ? (
                <button 
                    onClick={handleLogin}
                    className="w-full p-2 bg-blue-500 text-white rounded"
                >
                    Googleでログイン
                </button>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <button 
                            onClick={handleLogout}
                            className="p-2 bg-red-500 text-white rounded"
                        >
                            ログアウト
                        </button>
                        <Link 
                            href="/ask"
                            className="button"
                        >
                            質問ページへ
                        </Link>
                        <Link 
                            href="/mypage"
                            className="button"
                        >
                            マイページ
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">質問を検索</h2>
                        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="キーワードで検索"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="p-2 border rounded"
                            />
                            <select
                                value={selectedFaculty ?? ''}
                                onChange={(e) => setSelectedFaculty(Number(e.target.value))}
                                className="p-2 border rounded"
                            >
                                <option value="">学部を選択してください</option>
                                {faculties.map((faculty) => (
                                    <option key={faculty.faculty_id} value={faculty.faculty_id}>
                                        {faculty.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedCourse ?? ''}
                                onChange={(e) => setSelectedCourse(Number(e.target.value))}
                                className="p-2 border rounded"
                            >
                                <option value="">質義名を選択してください</option>
                                {courses.map((course) => (
                                    <option key={course.course_id} value={course.course_id}>
                                        {course.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={selectedLectureDate}
                                onChange={(e) => setSelectedLectureDate(e.target.value)}
                                className="p-2 border rounded"
                            />
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showUnsolvedOnly}
                                    onChange={(e) => setShowUnsolvedOnly(e.target.checked)}
                                    className="mr-2"
                                />
                                未解決のみ表示
                            </label>
                            <button
                                type="submit"
                                className="p-2 bg-blue-500 text-white rounded"
                            >
                                検索
                            </button>
                        </form>
                    </div>

                    <QuestionList questions={questions} />
                </div>
            )}
        </div>
    );
}
