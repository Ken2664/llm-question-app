import React from 'react'
import { Loader2 } from 'lucide-react'

export function AIThinking() {
  return (
    <div className="flex items-center space-x-2 text-blue-500">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="text-3xl font-medium">AIが回答を生成中...</span>
      <span className="animate-pulse"></span>
    </div>
  )
}