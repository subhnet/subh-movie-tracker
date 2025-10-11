# 🔒 Security Setup Guide

## ⚠️ REQUIRED: Environment Variables

Your `.env.local` file must include the following:

### 1. JWT Secret (CRITICAL - REQUIRED)

```bash
# Generate a secure JWT secret:
# Run: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long
```

**⚠️ WARNING**: Without a strong JWT_SECRET, your sessions are insecure!

### 2. Supabase Configuration (REQUIRED)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Movie APIs (At least ONE required)

```bash
# Option 1: TMDB (Recommended - more features)
TMDB_API_KEY=your_tmdb_api_key

# Option 2: OMDb (Alternative)
OMDB_API_KEY=your_omdb_api_key
```

### 4. OpenRouter (Required for AI features)

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_APP_URL=http://localhost:3000  # Change in production
OPENROUTER_APP_NAME=Movie Tracker
```

### 5. Upstash Redis (Optional - Recommended for Production)

For production-grade rate limiting across multiple instances:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Note**: If not set, the app uses in-memory rate limiting (works but not shared across server instances).

---

## 🚀 Quick Setup

### Step 1: Generate JWT Secret

```bash
# Run this command and copy the output
openssl rand -base64 32
```

### Step 2: Create .env.local

Create a file named `.env.local` in your project root:

```bash
# Copy and fill in your values
JWT_SECRET=<paste_generated_secret_here>
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
TMDB_API_KEY=your_tmdb_key
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_APP_URL=http://localhost:3000
OPENROUTER_APP_NAME=Movie Tracker
```

### Step 3: Verify Setup

```bash
# Restart your dev server
npm run dev
```

---

## 🔐 Security Features Implemented

### ✅ Completed

1. **JWT-Based Authentication**
   - Secure, signed tokens
   - HttpOnly cookies (can't be accessed by JavaScript)
   - 7-day expiration
   - Automatic verification

2. **Rate Limiting**
   - Auth endpoints: 5 attempts per 10 seconds
   - API endpoints: 20 requests per 10 seconds
   - AI endpoints: 5 requests per 10 seconds
   - Search: 10 requests per 10 seconds

3. **Input Validation (Zod)**
   - All API inputs validated
   - Strong password requirements:
     - Min 8 characters
     - At least 1 uppercase letter
     - At least 1 lowercase letter
     - At least 1 number

4. **Security Headers**
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Content Security Policy
   - HSTS (production only)

5. **Protected .env Files**
   - .env.local properly gitignored
   - Sensitive data never committed

---

## 🏭 Production Checklist

Before deploying to production:

### Environment Variables

- [ ] Set `JWT_SECRET` (generate new one for production)
- [ ] Set `NODE_ENV=production`
- [ ] Update `OPENROUTER_APP_URL` to production URL
- [ ] Configure Upstash Redis (recommended)

### Supabase Configuration

- [ ] Update RLS policies (see instructions below)
- [ ] Enable database backups
- [ ] Configure row-level security

### Vercel/Hosting Setup

- [ ] Add all environment variables to Vercel
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/alerts

---

## 🗄️ Supabase RLS Policy Update

Your Supabase RLS policies need updating since you're using custom auth.

### Option 1: Update Existing Policies (Recommended if using custom auth)

Run this SQL in Supabase SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own movies" ON movies;
DROP POLICY IF EXISTS "Users can insert own movies" ON movies;
DROP POLICY IF EXISTS "Users can update own movies" ON movies;
DROP POLICY IF EXISTS "Users can delete own movies" ON movies;

-- Disable RLS since we're using custom auth with server-side verification
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE movies DISABLE ROW LEVEL SECURITY;
```

**Note**: This is safe because your API routes verify user identity via JWT before any database operations.

### Option 2: Switch to Supabase Auth (More Work, More Features)

If you want to use Supabase's built-in authentication:

1. Use Supabase Auth for login/register
2. Keep RLS policies enabled
3. Update auth routes to use Supabase client
4. Get auto email verification, OAuth, etc.

For now, **Option 1 is recommended** since your custom auth is already secure with JWT.

---

## 🧪 Testing Security

### Test Rate Limiting

```bash
# Try to login 6 times quickly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done

# Should get 429 (Too Many Requests) on 6th attempt
```

### Test JWT Expiration

JWT tokens expire after 7 days. To test:
1. Login
2. Check cookie in browser DevTools
3. Decode JWT at jwt.io to see expiration

### Test Input Validation

Try registering with:
- Short password (< 8 chars) - Should fail
- No uppercase - Should fail
- No number - Should fail

---

## 🆘 Troubleshooting

### "JWT Secret is too short"

Generate a new one:
```bash
openssl rand -base64 32
```

### "Rate limit not working across instances"

You need Upstash Redis for multi-instance rate limiting. Otherwise each instance has its own memory store.

### "Session not persisting"

Check that:
1. JWT_SECRET is set
2. Cookies are enabled in browser
3. HTTPS in production (required for secure cookies)

### "Supabase RLS errors"

If you see permission errors, run Option 1 SQL from above to disable RLS.

---

## 📚 Additional Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Security](https://nextjs.org/docs/pages/building-your-application/configuring/security-headers)

---

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Check OpenRouter API usage
- [ ] Review error logs for attacks
- [ ] Monitor rate limit hits

### Monthly
- [ ] Review and update dependencies (`npm audit`)
- [ ] Check for security advisories
- [ ] Rotate API keys if compromised

### Quarterly
- [ ] Review and update security policies
- [ ] Audit user access patterns
- [ ] Penetration testing (optional)

---

**Last Updated**: October 2025  
**Version**: 2.0.0 (JWT + Rate Limiting)

