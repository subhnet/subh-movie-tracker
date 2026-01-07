
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

// Interface for all AI providers
export interface AIService {
    generateResponse(systemPrompt: string, userPrompt: string): Promise<any>
}

// 1. Google Gemini Provider (Official SDK)
class GeminiProvider implements AIService {
    private genAI: GoogleGenerativeAI
    private model: any

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey)
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-lite-preview-02-05', // Lite Preview (Optimized for cost/quota)
            generationConfig: {
                temperature: 0.8,
                responseMimeType: "application/json",
            }
        })
    }

    async generateResponse(systemPrompt: string, userPrompt: string): Promise<any> {
        try {
            // Gemini doesn't have "system" roles in the same way as OpenAI in the basic API (sometimes),
            // but we can prepend it or use the systemInstruction if supported (v1beta).
            // For stability with standard 'gemini-pro', we'll merge them or use chat.

            // Let's use the chat mode which is robust
            const chat = this.model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}` }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood. I will act as the system described." }],
                    },
                ],
            })

            const result = await chat.sendMessage(userPrompt)
            const response = result.response
            const text = response.text()

            return JSON.parse(text)
        } catch (error) {
            console.error('Gemini API Error:', error)
            throw error
        }
    }
}

// 2. OpenRouter Provider (OpenAI Compatible)
class OpenRouterProvider implements AIService {
    private openai: OpenAI

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': process.env.OPENROUTER_APP_URL || 'http://localhost:3000',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'Movie Tracker',
            },
        })
    }

    async generateResponse(systemPrompt: string, userPrompt: string): Promise<any> {
        const models = [
            'google/gemini-2.0-flash-exp:free', // Primary Google Model
            'meta-llama/llama-3.1-8b-instruct:free', // Strong Meta Fallback
            'mistralai/mistral-7b-instruct:free', // Mistral Fallback
            'microsoft/phi-3-mini-128k-instruct:free', // Microsoft Fallback
            'openrouter/auto' // Last resort: let OpenRouter pick reasonably
        ]

        let lastError: any

        for (const model of models) {
            try {
                // console.log(`Attempting AI generation with model: ${model}`)
                const response = await this.openai.chat.completions.create({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.8,
                    response_format: { type: 'json_object' } as any,
                })

                const content = response.choices[0]?.message?.content || '{}'
                return JSON.parse(content)

            } catch (error: any) {
                // Only retry on specific errors (Rate Limit or Server Error)
                if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
                    console.warn(`Model ${model} failed with ${error.status}. Retrying with next model...`)
                    lastError = error
                    continue
                }
                // If it's a client error (e.g. 401 Invalid Key), fail immediately
                throw error
            }
        }

        console.error('All AI models failed.')
        throw lastError
    }
}

// 3. Cerebras Provider (Fastest Llama Inference)
class CerebrasProvider implements AIService {
    private openai: OpenAI

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.cerebras.ai/v1',
        })
    }

    async generateResponse(systemPrompt: string, userPrompt: string): Promise<any> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'llama-3.3-70b', // Cerebras optimized model (Verify exact ID)
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                response_format: { type: 'json_object' },
            })

            const content = response.choices[0]?.message?.content || '{}'
            return JSON.parse(content)
        } catch (error) {
            console.error('Cerebras API Error:', error)
            throw error
        }
    }
}

// Factory Function
export function getAIProvider(): AIService {
    const provider = process.env.AI_PROVIDER || 'gemini'

    if (provider === 'openrouter') {
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing')
        return new OpenRouterProvider(apiKey)
    } else if (provider === 'cerebras') {
        const apiKey = process.env.CEREBRAS_API_KEY
        if (!apiKey) throw new Error('CEREBRAS_API_KEY is missing')
        return new CerebrasProvider(apiKey)
    } else {
        // Default to Gemini
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) throw new Error('GEMINI_API_KEY is missing')
        return new GeminiProvider(apiKey)
    }
}
