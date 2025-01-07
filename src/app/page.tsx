'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { supabase } from '@/utils/supabaseClient'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { LogIn, LogOut, Search, PlusCircle, UserIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Question = {
  id: number
  question_text: string
  answer_text: string | null
  solved: boolean
}

function QuestionList({ questions }: { questions: Question[] }) {
  return (
    <ul className="space-y-4">
      {questions.map((q) => (
        <li key={q.id}>
          <Link href={`/question/${q.id}`}>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{q.question_text}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.answer_text ? '回答あり' : '未回答'}
                  </p>
                </div>
                <span className={`text-2xl ${q.solved ? 'text-green-500' : 'text-red-500'}`}>
                  {q.solved ? '✅' : '❌'}
                </span>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [faculties, setFaculties] = useState<{ faculty_id: number; name: string }[]>([])
  const [courses, setCourses] = useState<{ course_id: number; name: string }[]>([])
  const [selectedFaculty, setSelectedFaculty] = useState<string>('')
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedLectureDate, setSelectedLectureDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnsolvedOnly, setShowUnsolvedOnly] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('name, faculty_id, role')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching user data:', error)
        } else if (!userData || !userData.name || !userData.faculty_id || !userData.role) {
          router.push('/profile')
        }
      }
    }

    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('name, faculty_id, role')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching user data:', error)
        } else if (!userData || !userData.name || !userData.faculty_id || !userData.role) {
          router.push('/profile')
        }
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const fetchFaculties = async () => {
      const { data, error } = await supabase.from('faculties').select('faculty_id, name')
      if (error) console.error('Error fetching faculties:', error)
      else setFaculties(data || [])
    }

    const fetchCourses = async () => {
      const { data, error } = await supabase.from('courses').select('course_id, name')
      if (error) console.error('Error fetching courses:', error)
      else setCourses(data || [])
    }

    fetchFaculties()
    fetchCourses()
  }, [])

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) console.error('Error logging in:', error.message)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error logging out:', error.message)
  }

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

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
      `)

    if (selectedFaculty) {
      query = query.eq('lectures.courses.faculties.faculty_id', selectedFaculty)
    }
    if (selectedCourse) {
      query = query.eq('lectures.courses.course_id', selectedCourse)
    }
    if (selectedLectureDate) {
      query = query.eq('lectures.date', selectedLectureDate)
    }
    if (searchQuery) {
      query = query.ilike('question_text', `%${searchQuery}%`)
    }
    if (showUnsolvedOnly) {
      query = query.eq('solved', false)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error searching questions:', error)
    } else {
      setQuestions(data.map(q => ({
        id: q.id,
        question_text: q.question_text,
        answer_text: q.answer_text,
        solved: q.solved
      })))
    }
  }

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
        console.error('Error signing up:', error.message);
    } else {
        router.push('/profile');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">LLM質問応答アプリケーション</CardTitle>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="space-y-4">
              <Button onClick={handleLogin} className="w-full">
                <LogIn className="mr-2 h-4 w-4" /> Googleでログイン
              </Button>
              <Button onClick={handleSignUp} className="w-full">
                <LogIn className="mr-2 h-4 w-4" /> Googleで新規登録
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button onClick={handleLogout} variant="outline">
                  <LogOut className="mr-2 h-4 w-4" /> ログアウト
                </Button>
                <div className="space-x-2">
                  <Button asChild>
                    <Link href="/ask">
                      <PlusCircle className="mr-2 h-4 w-4" /> 質問する
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/mypage">
                      <UserIcon className="mr-2 h-4 w-4" /> マイページ
                    </Link>
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>質問を検索</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSearch} className="space-y-4">
                    <Input
                      type="text"
                      placeholder="キーワードで検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select onValueChange={setSelectedFaculty} value={selectedFaculty}>
                        <SelectTrigger>
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
                      <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                        <SelectTrigger>
                          <SelectValue placeholder="講義名を選択してください" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {courses.map((course) => (
                            <SelectItem key={course.course_id} value={course.course_id.toString()}>
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="date"
                      value={selectedLectureDate}
                      onChange={(e) => setSelectedLectureDate(e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="unsolved"
                        checked={showUnsolvedOnly}
                        onCheckedChange={(checked) => setShowUnsolvedOnly(checked as boolean)}
                      />
                      <label
                        htmlFor="unsolved"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        未解決のみ表示
                      </label>
                    </div>
                    <Button type="submit" className="w-full">
                      <Search className="mr-2 h-4 w-4" /> 検索
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>質問一覧</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuestionList questions={questions} />
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

