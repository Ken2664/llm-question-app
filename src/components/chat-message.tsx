import React from 'react';
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  console.log('Processed Content:', content);
  const processedContent = content
    .replace(/\\\[/g, '$$$')
    .replace(/\\\]/g, '$$$')
    .replace(/\\\(/g, '$$')
    .replace(/\\\)/g, '$$');

  console.log('Processed Content:', processedContent);
  return (
    <div
      className={classNames(
        'flex w-full',
        role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={classNames(
          'max-w-[85%] rounded-lg px-4 py-2 text-sm',
          role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        <p className="font-semibold mb-1">
          {role === 'user' ? 'あなた' : 'AI'}:
        </p>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h3: ({ ...props }) => (
              <h3 className="text-lg font-bold mt-4 mb-2" {...props} />
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
