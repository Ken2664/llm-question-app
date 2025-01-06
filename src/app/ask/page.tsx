'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import Link from 'next/link'
import { ThumbsUp, ThumbsDown, Send, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChatMessage } from "@/components/chat-message"
import React from 'react'

export default function AskPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [chatHistory, setChatHistory] = useState<{ question: string; answer: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [faculties, setFaculties] = useState<{ faculty_id: number; name: string }[]>([])
  const [courses, setCourses] = useState<{ course_id: number; name: string }[]>([])
  const [selectedFaculty, setSelectedFaculty] = useState<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [selectedLectureDate, setSelectedLectureDate] = useState<string>('')
  const [newFaculty, setNewFaculty] = useState('')
  const [newCourse, setNewCourse] = useState('')
  const [solved, setSolved] = useState<boolean | null>(null)
  const [showAddFaculty, setShowAddFaculty] = useState(false)
  const [showAddCourse, setShowAddCourse] = useState(false)

  useEffect(() => {
    fetchFaculties()
    fetchCourses()
    fetchUserFaculty()
  }, [])

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

  const fetchUserFaculty = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      console.error('Error fetching session:', sessionError)
      setError('セッションが無効です。再度ログインしてください。')
      return
    }

    const userId = sessionData.session.user.id
    const { data, error } = await supabase
      .from('users')
      .select('faculty_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user faculty:', error)
    } else {
      setSelectedFaculty(data?.faculty_id || null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        console.error('Error fetching session:', sessionError)
        setError('セッションが無効です。再度ログインしてください。')
        return
      }

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, lectureDate: selectedLectureDate, courseId: selectedCourse, facultyId: selectedFaculty }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'AIレスポンスの取得に失敗しました')
        throw new Error('Failed to fetch AI response')
      }

      const data = await response.json()
      console.log('API Response:', data)
      setAnswer(data.answer)
      setChatHistory([...chatHistory, { question, answer: data.answer }])
      setError(null)
    } catch (error) {
      console.error('Error fetching AI response:', error)
      setError((error as Error).message || 'AIレスポンスの取得中にエラーが発生しました')
    }
  }

  const addNewFaculty = async () => {
    if (!newFaculty) return
    const { data, error } = await supabase.from('faculties').insert([{ name: newFaculty }])
    if (error) {
      console.error('Error adding faculty:', error)
      setError('学部の追加に失敗しました')
    } else {
      setFaculties([...faculties, ...(data || [])])
      setNewFaculty('')
      setShowAddFaculty(false)
    }
  }

  const addNewCourse = async () => {
    if (!newCourse || selectedFaculty === null) return
    const { data, error } = await supabase.from('courses').insert([{ name: newCourse, faculty_id: selectedFaculty }])
    if (error) {
      console.error('Error adding course:', error)
      setError('講義名の追加に失敗しました')
    } else {
      setCourses([...courses, ...(data || [])])
      setNewCourse('')
      setShowAddCourse(false)
    }
  }

  const handleSolvedChange = async (isSolved: boolean) => {
    if (!question) {
      console.error('Question is empty or null')
      setError('質問が入力されていません')
      return
    }

    setSolved(isSolved)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        console.error('Error fetching session:', sessionError)
        setError('セッションが無効です。再度ログインしてください。')
        return
      }

      const userId = sessionData.session.user.id

      const { data: lectureData, error: lectureError } = await supabase
        .from('lectures')
        .select('id')
        .eq('course_id', selectedCourse)
        .eq('date', selectedLectureDate)
        .single()

      let lectureId = lectureData?.id

      if (!lectureId) {
        const { data: newLectureData, error: newLectureError } = await supabase
          .from('lectures')
          .insert([{ course_id: selectedCourse, number: 1, date: selectedLectureDate }])
          .select('id')
          .single()

        if (newLectureError) {
          console.error('Error adding lecture:', newLectureError)
          setError('授業の追加に失敗しました')
          return
        }

        lectureId = newLectureData.id
      }

      const { data, error: questionError } = await supabase
        .from('questions')
        .insert([{
          user_id: userId,
          lecture_id: lectureId,
          question_text: question,
          answer_text: answer,
          solved: isSolved
        }])

      if (questionError) {
        console.error('Error saving question:', questionError)
        setError('質問の保存に失敗しました')
      } else {
        console.log('Insert successful:', data)
      }
    } catch (error) {
      console.error('Error updating solved status:', error)
      setError((error as Error).message || '解決状態の更新中にエラーが発生しました')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <nav className="mb-8">
        <Link href="/" className="text-blue-500 hover:underline">トップ</Link> / QA
      </nav>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>質問を投稿</CardTitle>
          <CardDescription>学部、講義、日付を選択し、質問を入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Select onValueChange={(value) => setSelectedFaculty(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="学部を選択してください" />
                </SelectTrigger>
                <SelectContent>
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
              <Select onValueChange={(value) => setSelectedCourse(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="講義名を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.course_id} value={course.course_id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCourse(!showAddCourse)}
                className="w-full"
              >
                {showAddCourse ? 'キャンセル' : '講義名を追加'} <Plus className="ml-2 h-4 w-4" />
              </Button>
              {showAddCourse && (
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    placeholder="新しい講義名"
                  />
                  <Button type="button" onClick={addNewCourse}>追加</Button>
                </div>
              )}
            </div>
  
            <Input
              type="date"
              value={selectedLectureDate}
              onChange={(e) => setSelectedLectureDate(e.target.value)}
            />
  
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="質問を入力してください"
              rows={4}
            />
  
            <div className="flex justify-between">
              <Button
                type="button"
                variant={solved === true ? "default" : "outline"}
                onClick={() => handleSolvedChange(true)}
              >
                <ThumbsUp className="mr-2 h-4 w-4" /> 解決済み
              </Button>
              <Button
                type="button"
                variant={solved === false ? "default" : "outline"}
                onClick={() => handleSolvedChange(false)}
              >
                <ThumbsDown className="mr-2 h-4 w-4" /> 未解決
              </Button>
            </div>
  
            <Button type="submit" className="w-full">
              <Send className="mr-2 h-4 w-4" /> 送信
            </Button>
          </form>
        </CardContent>
      </Card>
  
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
  
      <Card>
        <CardHeader>
          <CardTitle>チャット履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chatHistory.map((chat, index) => (
              <React.Fragment key={index}>
                <ChatMessage role="user" content={chat.question} />
                <ChatMessage role="assistant" content={chat.answer} />
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}