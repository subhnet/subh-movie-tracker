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
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-6 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 shadow-xl">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`group relative max-w-[80%] rounded-2xl px-5 py-3 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                  : 'bg-gradient-to-br from-white to-gray-50 text-gray-800 border border-gray-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">CineMate</span>
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl px-5 py-3 shadow-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 shadow-lg max-w-[80%]">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="mb-4">
          <div className={`text-sm text-white/80 mb-2 font-semibold ${compact ? 'text-xs' : ''}`}>Quick prompts to get started:</div>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                className={`bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-full font-medium border border-white/30 transition-all hover:scale-105 hover:shadow-lg`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={sendMessage} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about movies..."
            disabled={loading}
            className="w-full bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-2xl px-6 py-4 pr-14 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all text-gray-800 placeholder-gray-500 shadow-xl disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-600 text-white p-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-white/60 text-center">
          💡 Tip: Ask me for recommendations, movie insights, or help choosing from your watchlist
        </div>
      </form>
    </div>
  )
}

