"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

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
        <div className="container">
            <nav>
                <Link href="/" className="link">トップ</Link> / プロフィール
            </nav>
            <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">プロフィール設定</h2>
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
                <button
                    onClick={handleSaveProfile}
                    className="w-full p-2 bg-blue-500 text-white rounded"
                >
                    プロフィールを保存
                </button>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        </div>
    );
} 