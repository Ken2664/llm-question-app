"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Link from 'next/link';

export default function AskPage() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [chatHistory, setChatHistory] = useState<{ question: string, answer: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [faculties, setFaculties] = useState<{ faculty_id: number; name: string }[]>([]);
    const [courses, setCourses] = useState<{ course_id: number; name: string }[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [selectedLectureDate, setSelectedLectureDate] = useState<string>('');
    const [newFaculty, setNewFaculty] = useState('');
    const [newCourse, setNewCourse] = useState('');
    const [solved, setSolved] = useState<boolean | null>(null);

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

        const fetchUserFaculty = async () => {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                console.error('Error fetching session:', sessionError);
                setError('セッションが無効です。再度ログインしてください。');
                return;
            }

            const userId = sessionData.session.user.id;
            const { data, error } = await supabase
                .from('users')
                .select('faculty_id')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user faculty:', error);
            } else {
                setSelectedFaculty(data?.faculty_id || null);
            }
        };

        fetchFaculties();
        fetchCourses();
        fetchUserFaculty();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            // セッション情報を確認
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                console.error('Error fetching session:', sessionError);
                setError('セッションが無効です。再度ログインしてください。');
                return;
            }

            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question, lectureDate: selectedLectureDate, courseId: selectedCourse, facultyId: selectedFaculty }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'AIレスポンスの取得に失敗しました');
                throw new Error('Failed to fetch AI response');
            }

            const data = await response.json();
            console.log('API Response:', data);
            setAnswer(data.answer);
            setChatHistory([...chatHistory, { question, answer: data.answer }]);
            setError(null);

            // AIの返答が返ってきた時点ではデータを挿入しない
        } catch (error) {
            console.error('Error fetching AI response:', error);
            setError((error as Error).message || 'AIレスポンスの取得中にエラーが発生しました');
        }
    };

    const addNewFaculty = async () => {
        if (!newFaculty) return;
        const { data, error } = await supabase.from('faculties').insert([{ name: newFaculty }]);
        if (error) {
            console.error('Error adding faculty:', error);
            setError('学部の追加に失敗しました');
        } else {
            setFaculties([...faculties, ...(data || [])]);
            setNewFaculty('');
        }
    };

    const addNewCourse = async () => {
        if (!newCourse || selectedFaculty === null) return;
        const { data, error } = await supabase.from('courses').insert([{ name: newCourse, faculty_id: selectedFaculty }]);
        if (error) {
            console.error('Error adding course:', error);
            setError('講義名の追加に失敗しました');
        } else {
            setCourses([...courses, ...(data || [])]);
            setNewCourse('');
        }
    };

    const handleSolvedChange = async (isSolved: boolean) => {
        if (!question) {
            console.error('Question is empty or null');
            setError('質問が入力されていません');
            return;
        }

        setSolved(isSolved);

        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                console.error('Error fetching session:', sessionError);
                setError('セッションが無効です。再度ログインしてください。');
                return;
            }

            const userId = sessionData.session.user.id;

            // 新しい授業を追加し、質問を保存
            const { data: lectureData, error: lectureError } = await supabase
                .from('lectures')
                .select('id')
                .eq('course_id', selectedCourse)
                .eq('date', selectedLectureDate)
                .single();

            let lectureId = lectureData?.id;

            if (!lectureId) {
                const { data: newLectureData, error: newLectureError } = await supabase
                    .from('lectures')
                    .insert([{ course_id: selectedCourse, number: 1, date: selectedLectureDate }])
                    .select('id')
                    .single();

                if (newLectureError) {
                    console.error('Error adding lecture:', newLectureError);
                    setError('授業の追加に失敗しました');
                    return;
                }

                lectureId = newLectureData.id;
            }

            const { data, error: questionError } = await supabase
                .from('questions')
                .insert([{
                    user_id: userId,
                    lecture_id: lectureId,
                    question_text: question,
                    answer_text: answer, // AIの返答を使用
                    solved: isSolved
                }]);

            if (questionError) {
                console.error('Error saving question:', questionError);
                setError('質問の保存に失敗しました');
            } else {
                console.log('Insert successful:', data);
            }
        } catch (error) {
            console.error('Error updating solved status:', error);
            setError((error as Error).message || '解決状態の更新中にエラーが発生しました');
        }
    };

    return (
        <div className="container">
            <nav>
                <Link href="/" className="link">トップ</Link> / QA
            </nav>
            <div>
                <form onSubmit={handleSubmit} className="mt-6">
                    <select
                        value={selectedFaculty ?? ''}
                        onChange={(e) => setSelectedFaculty(Number(e.target.value))}
                        className="w-full p-2 mb-4 border rounded"
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
                        className="w-full p-2 mb-4 border rounded"
                    >
                        <option value="">講義名を選択してください</option>
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
                        className="w-full p-2 mb-4 border rounded"
                    />
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="質問を入力してください"
                        className="w-full p-2 mb-4 border rounded"
                    />
                    <div className="flex justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => handleSolvedChange(true)}
                            className={`w-48 p-2 ${solved === true ? 'bg-green-500' : 'bg-gray-300'} text-white rounded`}
                        >
                            解決済み
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSolvedChange(false)}
                            className={`w-48 p-2 ${solved === false ? 'bg-red-500' : 'bg-gray-300'} text-white rounded`}
                        >
                            未解決
                        </button>
                    </div>
                    <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
                        送信
                    </button>
                </form>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">新しい学部を追加</h2>
                <input
                    type="text"
                    value={newFaculty}
                    onChange={(e) => setNewFaculty(e.target.value)}
                    placeholder="新しい学部名"
                    className="w-full p-2 mb-4 border rounded"
                />
                <button onClick={addNewFaculty} className="w-full p-2 bg-blue-500 text-white rounded">
                    学部を追加
                </button>

                <h2 className="text-xl font-semibold mb-4 mt-8">新しい講義名を追加</h2>
                <input
                    type="text"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    placeholder="新しい講義名"
                    className="w-full p-2 mb-4 border rounded"
                />
                <button onClick={addNewCourse} className="w-full p-2 bg-blue-500 text-white rounded">
                    講義名を追加
                </button>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">チャット履歴</h2>
                <ul className="space-y-4">
                    {chatHistory.map((chat, index) => (
                        <li key={index} className="flex flex-col space-y-2">
                            <div className="self-end bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                                <strong>あなた:</strong> {chat.question}
                            </div>
                            <div className="self-start bg-gray-200 p-3 rounded-lg max-w-xs">
                                <strong>AI:</strong> {chat.answer}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
} 