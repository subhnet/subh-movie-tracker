'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  userId?: string
  compact?: boolean
}

export default function ChatInterface({ userId, compact = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm CineMate, your personal movie recommendation assistant. I've analyzed your viewing history and taste preferences. How can I help you discover your next great movie?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)
    setError('')

    try {
      // Build conversation history (last 10 messages for context)
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({ role: msg.role, content: msg.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to get response')
        return
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const quickPrompts = [
    "Recommend a movie for tonight",
    "I'm in the mood for something intense",
    "What's a hidden gem I might like?",
    "Suggest movies like my top-rated films",
    "What should I watch from my watchlist?"
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-[calc(100vh-8rem)]' : 'h-[calc(100vh-12rem)] max-h-[800px]'}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`group relative max-w-[85%] rounded-2xl px-6 py-4 shadow-lg ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-purple-700 text-white'
                  : 'bg-white/10 text-white border border-white/10'
                }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-white/50 tracking-wider uppercase">CineMate</span>
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
              <div className={`text-[10px] mt-2 font-medium ${msg.role === 'user' ? 'text-white/60' : 'text-white/30'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm font-medium text-white/60">CineMate is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 shadow-lg max-w-[80%] backdrop-blur-md">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-red-200">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <div className={`text-sm text-white/60 mb-3 font-semibold uppercase tracking-wider pl-2 ${compact ? 'text-xs' : ''}`}>Quick prompts</div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                className={`bg-white/5 hover:bg-white/10 backdrop-blur-md text-white/90 ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} rounded-xl font-medium border border-white/10 transition-all hover:scale-105 hover:shadow-lg hover:border-white/20`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={sendMessage} className="relative">
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about movies..."
            disabled={loading}
            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 pr-14 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 focus:ring-1 focus:ring-purple-500/50 transition-all text-white placeholder-white/30 shadow-xl disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 text-white p-2.5 rounded-xl hover:bg-white/20 hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 border border-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-3 text-xs text-white/40 text-center font-medium">
          ✨ Pro tip: Try asking "Recommend something based on what I watched recently"
        </div>
      </form>
    </div>
  )
}
