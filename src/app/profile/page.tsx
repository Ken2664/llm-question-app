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
        <div style={{ padding: '20px' }}>
            <nav>
                <Link href="/">トップ</Link> / プロフィール
            </nav>
            <div style={{ marginTop: '20px' }}>
                <h2 className="text-xl font-semibold mb-4">プロフィール設定</h2>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="名前を入力してください"
                    style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                />
                <select
                    value={selectedFaculty ?? ''}
                    onChange={(e) => setSelectedFaculty(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
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
                    style={{ width: '100%', padding: '10px', backgroundColor: '#00796b', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                    プロフィールを保存
                </button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        </div>
    );
} 