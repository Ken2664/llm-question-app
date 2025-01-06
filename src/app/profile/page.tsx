"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [faculties, setFaculties] = useState<{ faculty_id: number; name: string }[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };

        getSession();

        const fetchFaculties = async () => {
            const { data, error } = await supabase.from('faculties').select('faculty_id, name');
            if (error) console.error('Error fetching faculties:', error);
            else setFaculties(data || []);
        };

        fetchFaculties();
    }, []);

    const handleSaveProfile = async () => {
        if (!user) {
            setError('ユーザーがログインしていません');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    name,
                    faculty_id: selectedFaculty
                }, { onConflict: 'id' });

            if (error) {
                console.error('Error saving profile:', error);
                setError('プロフィールの保存に失敗しました');
            } else {
                console.log('Profile saved:', data);
                setError(null);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('プロフィールの保存中にエラーが発生しました');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>プロフィール設定</CardTitle>
                </CardHeader>
                <CardContent>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="名前を入力してください"
                        className="w-full p-2 mb-4 border rounded"
                    />
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
                    <Button
                        onClick={handleSaveProfile}
                        className="w-full"
                    >
                        プロフィールを保存
                    </Button>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                </CardContent>
            </Card>
        </div>
    );
} 