# OpenRouter Integration for AI Recommendations

## ✅ Setup Complete

Your Movie Tracker now uses **OpenRouter** for AI-powered movie recommendations instead of OpenAI. This gives you access to multiple AI models at competitive prices!

## 🔑 API Key Configuration

Your OpenRouter API key has been configured in `.env.local`:
- ✅ File created: `.env.local`
- ✅ API key added (already in `.gitignore` - won't be committed to git)
- ✅ App name and URL configured for OpenRouter analytics

## 🤖 Current Model

The app is currently configured to use: **`openai/gpt-4o-mini`**
- Fast and cost-effective
- Great for movie recommendations
- Low cost per request

## 🎯 Alternative Models You Can Try

You can easily switch models by editing `/app/api/recommend/route.ts` line 52:

### Budget-Friendly Options:
```typescript
model: 'openai/gpt-3.5-turbo'     // Very cheap, fast, decent quality
model: 'openai/gpt-4o-mini'       // Current choice - best value
model: 'google/gemini-flash-1.5'  // Very fast and cheap
```

### Premium Options for Better Quality:
```typescript
model: 'anthropic/claude-3.5-sonnet'  // Excellent reasoning and taste
model: 'openai/gpt-4-turbo'           // Very capable, higher cost
model: 'anthropic/claude-3-opus'      // Top quality, most expensive
model: 'google/gemini-pro-1.5'        // Good balance
```

### Specialized Options:
```typescript
model: 'meta-llama/llama-3.1-70b-instruct'  // Open source, good quality
model: 'mistralai/mistral-large'             // European option
```

## 💰 Pricing

OpenRouter charges per token. Check current pricing at: https://openrouter.ai/models

Typical recommendation request costs with GPT-4o-mini: **$0.001 - $0.005** per request

## 🚀 How to Use

1. **Start/Restart your dev server** (if it's running):
   ```bash
   npm run dev
   ```

2. **Navigate to AI Recommendations page**:
   - Click "AI Recommendations" in the navbar
   - Or go to: http://localhost:3000/recommendations

3. **Choose recommendation type**:
   - **New Recommendations**: Discover movies you haven't seen
   - **Prioritize Watchlist**: Get suggestions from your existing watchlist

4. **Click "✨ Get AI Recommendations"**

## 🔧 Troubleshooting

### Error: "OpenRouter API key not configured"
- Make sure `.env.local` exists in your project root
- Restart your dev server after creating/modifying `.env.local`

### Error: "quota exceeded"
- Add credits to your OpenRouter account: https://openrouter.ai/credits
- Check your usage: https://openrouter.ai/activity

### Recommendations seem off-topic
- Try a different model (Claude models are great for creative tasks)
- Adjust the temperature in the code (lower = more focused, higher = more creative)

## 📊 OpenRouter Dashboard

Monitor your usage and costs:
- Dashboard: https://openrouter.ai/dashboard
- Activity: https://openrouter.ai/activity
- Models: https://openrouter.ai/models

## 🔐 Security Notes

- ✅ `.env.local` is in `.gitignore` - your API key won't be committed
- ✅ Never share your API key publicly
- ✅ The key is only accessible server-side (API routes)
- ✅ Not exposed to client browsers

## 🎨 UI Updates

The recommendations page has been updated with the new look and feel:
- Translucent white cards with backdrop blur
- Better spacing and typography
- Smooth animations on hover
- Consistent design with the dashboard

## 📝 Files Modified

1. `/app/api/recommend/route.ts` - Updated to use OpenRouter API
2. `/app/recommendations/page.tsx` - Updated UI and error messages
3. `/.env.local` - Created with your API key (not in git)

## 🎬 Enjoy!

Your movie tracker now has powerful AI recommendations powered by OpenRouter. Try different models to find your favorite!

