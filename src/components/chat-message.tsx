import React from 'react'
import classNames from 'classnames'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={classNames(
        "flex w-full",
        role === 'user' ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={classNames(
          "max-w-[80%] rounded-lg px-4 py-2 text-sm",
          role === 'user'
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-900"
        )}
      >
        <p className="font-semibold mb-1">
          {role === 'user' ? 'あなた' : 'AI'}:
        </p>
        <p>{content}</p>
      </div>
    </div>
  )
}

