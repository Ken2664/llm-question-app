"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from "@/components/ui/loading";
import { Home, BookOpen, PlusCircle } from 'lucide-react';

interface Question {
    id: string;
    question_text: string;
    lecture_id: number;
    course_id: number;
}

interface Course {
    course_id: number;
    name: string;
    faculties: { name: string }[];
}

export default function TeacherPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [unresolvedQuestionsByCourse, setUnresolvedQuestionsByCourse] = useState<Record<number, Question[]>>({});
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [allCourses, setAllCourses] = useState<Course[]>([]);

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
            setLoading(false);
        };

        getSession();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const fetchAssignedCourses = async () => {
            const { data: assignedCoursesData, error: assignedCoursesError } = await supabase
                .from('courses')
                .select(`
                    course_id,
                    name,
                    faculties (
                        name
                    )
                `)
                .eq('teacher_id', user.id);

            if (assignedCoursesError) {
                console.error('担当教科の取得エラー:', assignedCoursesError);
                return;
            }

            setCourses(assignedCoursesData || []);
        };

        const fetchAllCourses = async () => {
            const { data: allCoursesData, error: allCoursesError } = await supabase
                .from('courses')
                .select(`
                    course_id,
                    name,
                    faculties (
                        name
                    )
                `);

            if (allCoursesError) {
                console.error('すべての教科の取得エラー:', allCoursesError);
                return;
            }

            setAllCourses(allCoursesData || []);
        };

        fetchAssignedCourses();
        fetchAllCourses();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const fetchUnresolvedQuestionsByCourse = async () => {
            const { data: unresolvedQuestionsData, error: unresolvedQuestionsError } = await supabase
                .from('questions')
                .select(`
                    id,
                    question_text,
                    lecture_id,
                    lectures (
                        course_id
                    )
                `)
                .eq('solved', false);

            if (unresolvedQuestionsError) {
                console.error('未解決の質問の取得エラー:', unresolvedQuestionsError);
                return;
            }

            const questionsByCourse = unresolvedQuestionsData.reduce((acc: Record<number, Question[]>, question) => {
                const lectures = Array.isArray(question.lectures) ? question.lectures : [question.lectures];
                const courseId = lectures[0]?.course_id;
                if (!acc[courseId]) {
                    acc[courseId] = [];
                }
                acc[courseId].push({
                    ...question,
                    course_id: courseId
                });
                return acc;
            }, {});

            setUnresolvedQuestionsByCourse(questionsByCourse);
        };

        fetchUnresolvedQuestionsByCourse();
    }, [user, courses]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const fetchAssignedCourses = async () => {
        if (!user) return;

        const { data: assignedCoursesData, error: assignedCoursesError } = await supabase
            .from('courses')
            .select(`
                course_id,
                name,
                faculties (
                    name
                )
            `)
            .eq('teacher_id', user.id);

        if (assignedCoursesError) {
            console.error('担当教科の取得エラー:', assignedCoursesError);
            return;
        }

        setCourses(assignedCoursesData || []);
    };

    const handleCourseRegistration = async () => {
        if (!selectedCourse) return;

        const { error: updateError } = await supabase
            .from('courses')
            .update({ teacher_id: user?.id })
            .eq('course_id', selectedCourse);

        if (updateError) {
            console.error('コースのteacher_id更新エラー:', updateError);
        } else {
            alert('コースが登録され、teacher_idが更新されました');
            fetchAssignedCourses();
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center">
                        <BookOpen className="mr-2" />
                        教員用ページ
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <BookOpen className="mr-2" />
                            担当教科ごとの未解決の質問
                        </h2>
                        {courses.map(course => (
                            <Card key={course.course_id} className="mb-6">
                                <CardHeader>
                                    <CardTitle className="text-lg">{course.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-4">
                                        {unresolvedQuestionsByCourse[course.course_id]?.map(question => (
                                            <li key={question.id} className="border p-4 rounded-lg hover:bg-gray-100 transition">
                                                <Link href={`/question/${question.id}`} className="block text-lg text-blue-600 hover:underline">
                                                    <strong>質問:</strong> {question.question_text}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold flex items-center">
                                <PlusCircle className="mr-2" />
                                講義を登録
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="講義を選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allCourses.map((course) => {
                                        const facultiesArray = Array.isArray(course.faculties) ? course.faculties : [course.faculties];
                                        return (
                                            <SelectItem key={course.course_id} value={course.course_id.toString()}>
                                                {course.name} ({facultiesArray.map(faculty => faculty.name).join(', ')})
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleCourseRegistration} className="mt-4 w-full">
                                登録
                            </Button>
                        </CardContent>
                    </Card>
                    <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                        <Home className="mr-2" />
                        トップページに戻る
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

