"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';

interface Question {
    id: string;
    question_text: string;
}

interface Course {
    course_id: number;
    name: string;
}

export default function TeacherPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [unresolvedQuestionsByCourse, setUnresolvedQuestionsByCourse] = useState<Record<string, Question[]>>({});
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user ?? null;
            setUser(user);

            if (user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (userError || userData?.role !== 'teacher') {
                    router.push('/');
                }
            } else {
                router.push('/');
            }
        };

        getSession();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const fetchUnresolvedQuestionsByCourse = async () => {
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('course_id, name')
                .eq('teacher_id', user.id);

            if (coursesError) {
                console.error('コースの取得エラー:', coursesError);
                return;
            }

            const courses = coursesData || [];
            setCourses(courses);

            const unresolvedQuestionsByCourse: Record<string, Question[]> = {};

            for (const course of courses) {
                const { data: lectureIdsData, error: lectureIdsError } = await supabase
                    .from('lectures')
                    .select('id')
                    .eq('course_id', course.course_id);

                if (lectureIdsError) {
                    console.error('講義IDの取得エラー:', lectureIdsError);
                    continue;
                }

                const lectureIds = lectureIdsData?.map(lecture => lecture.id) || [];

                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('id, question_text')
                    .in('lecture_id', lectureIds)
                    .is('solved', false);

                if (questionsError) {
                    console.error('未解決の質問の取得エラー:', questionsError);
                } else {
                    unresolvedQuestionsByCourse[course.name] = questionsData || [];
                }
            }

            setUnresolvedQuestionsByCourse(unresolvedQuestionsByCourse);
        };

        fetchUnresolvedQuestionsByCourse();
    }, [user]);

    const handleCourseRegistration = async () => {
        if (!selectedCourse) return;

        const { error: updateError } = await supabase
            .from('courses')
            .update({ teacher_id: user?.id })
            .eq('id', selectedCourse);

        if (updateError) {
            console.error('コースのteacher_id更新エラー:', updateError);
        } else {
            alert('コースが登録され、teacher_idが更新されました');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">教員用ページ</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-4">担当教科ごとの未解決の質問</h2>
                        {courses.map(course => (
                            <div key={course.course_id} className="mb-6">
                                <h3 className="text-lg font-semibold">{course.name}</h3>
                                <ul className="space-y-4">
                                    {unresolvedQuestionsByCourse[course.name]?.map(question => (
                                        <li key={question.id} className="border p-4 rounded-lg hover:bg-gray-100 transition">
                                            <Link href={`/question/${question.id}`} className="block text-lg text-blue-600 hover:underline">
                                                <strong>質問:</strong> {question.question_text}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-4">担当教科を登録</h2>
                        <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                            <SelectTrigger>
                                <SelectValue placeholder="教科を選択してください" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {courses.map((course) => (
                                    <SelectItem key={course.course_id} value={course.course_id.toString()}>
                                        {course.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleCourseRegistration} className="mt-4">
                            登録
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 