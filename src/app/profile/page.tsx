"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [faculties, setFaculties] = useState<{ faculty_id: number; name: string }[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<string>('');
    const [newFaculty, setNewFaculty] = useState('');
    const [showAddFaculty, setShowAddFaculty] = useState(false);
    const router = useRouter();

    const isProfileComplete = name && selectedFaculty && role;

    const fetchFaculties = async () => {
        const { data, error } = await supabase.from('faculties').select('faculty_id, name');
        if (error) console.error('Error fetching faculties:', error);
        else setFaculties(data || []);
    };

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('name, faculty_id, role')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user role:', error);
                } else {
                    setName(userData.name || '');
                    setSelectedFaculty(userData.faculty_id?.toString() || '');
                    setRole(userData.role || '');
                }
            }
        };

        getSession();
        fetchFaculties();
    }, []);

    const handleSaveProfile = async () => {
        if (!user) {
            setError('ユーザーがログインしていません');
            return;
        }

        if (!name) {
            setError('名前を入力してください');
            return;
        }

        if (!selectedFaculty) {
            setError('学部を選択してください');
            return;
        }

        if (!role) {
            setError('役職を選択してください');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    name,
                    faculty_id: parseInt(selectedFaculty),
                    role
                }, { onConflict: 'id' });

            if (error) {
                console.error('Error saving profile:', error);
                setError('プロフィールの保存に失敗しました');
            } else {
                console.log('Profile saved:', data);
                setError(null);
                router.push('/mypage');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('プロフィールの保存中にエラーが発生しました');
        }
    };

    const addNewFaculty = async () => {
        if (!newFaculty) return;
        const { error } = await supabase.from('faculties').insert([{ name: newFaculty }]);
        if (error) {
            console.error('Error adding faculty:', error);
            setError('学部の追加に失敗しました');
        } else {
            setNewFaculty('');
            setShowAddFaculty(false);
            fetchFaculties();
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">プロフィール設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">名前</Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="名前を入力してください"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="faculty">学部</Label>
                        <Select onValueChange={setSelectedFaculty} value={selectedFaculty}>
                            <SelectTrigger id="faculty" className="bg-white">
                                <SelectValue placeholder="学部を選択してください" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {faculties.map((faculty) => (
                                    <SelectItem key={faculty.faculty_id} value={faculty.faculty_id.toString()}>
                                        {faculty.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddFaculty(!showAddFaculty)}
                            className="w-full"
                        >
                            {showAddFaculty ? 'キャンセル' : '学部を追加'} <Plus className="ml-2 h-4 w-4" />
                        </Button>
                        {showAddFaculty && (
                            <div className="flex space-x-2">
                                <Input
                                    type="text"
                                    value={newFaculty}
                                    onChange={(e) => setNewFaculty(e.target.value)}
                                    placeholder="新しい学部名"
                                />
                                <Button type="button" onClick={addNewFaculty}>追加</Button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">役職</Label>
                        <Select onValueChange={setRole} value={role}>
                            <SelectTrigger id="role" className="bg-white">
                                <SelectValue placeholder="役職を選択してください" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="teacher">教師</SelectItem>
                                <SelectItem value="student">学生</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full" disabled={!isProfileComplete}>
                        <Save className="mr-2" /> プロフィールを保存
                    </Button>
                    <Button asChild variant="outline" className="w-full mt-4">
                        <Link href="/mypage">
                            マイページに戻る
                        </Link>
                    </Button>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>エラー</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
