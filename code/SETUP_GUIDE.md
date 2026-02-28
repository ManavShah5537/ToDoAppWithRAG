# Quick Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **PostgreSQL 14+** - [Download](https://www.postgresql.org/)
3. **Redis 6+** - [Download](https://redis.io/) or use Docker
4. **Google OAuth Credentials** - [Setup](https://developers.google.com/identity/protocols/oauth2)
5. **OpenAI API Key** - [Get here](https://platform.openai.com/api-keys)
6. **Hugging Face API Key** - [Get here](https://huggingface.co/settings/tokens)

## Step 1: Clone or Navigate to Project

```bash
cd d:\HackathonIITJ\code
```

## Step 2: Install Dependencies

```bash
pnpm install
```

## Step 3: Setup PostgreSQL

**On Windows with PostgreSQL installed:**

```bash
# Create database
psql -U postgres -c "CREATE DATABASE attention_system"

# Enable pgvector extension
psql -U postgres -d attention_system -c "CREATE EXTENSION pgvector"

# Verify
psql -U postgres -d attention_system -c "SELECT extname FROM pg_extension WHERE extname = 'vector'"
```

## Step 4: Setup Environment Variables

```bash
# Copy example file
cp .env.example .env
```

**Edit `.env` file with your credentials:**

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/attention_system

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# LLM (OpenAI)
LLM_API_KEY=your_openai_api_key_here
LLM_PROVIDER=openai

# Hugging Face for Embeddings
HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# Server
PORT=3000
NODE_ENV=development
```

## Step 5: Start Redis

**Option A: Using WSL or Docker**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:6

# Or using WSL
redis-server
```

**Option B: Direct installation on Windows**
- Install from [Microsoft Store](ms-windows-store://pdp/9nblggh4nns1)
- Or use [Memurai](https://www.memurai.com/)

## Step 6: Build Project

```bash
pnpm build
```

## Step 7: Run Server

**Development Mode (with auto-reload):**
```bash
pnpm dev
```

**Production Mode:**
```bash
pnpm start
```

## Step 8: Verify Server is Running

Open in browser:
```
http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-02-28T..."
}
```

## Step 9: Test API

```bash
# Test authentication
curl -X POST http://localhost:3000/api/users/auth \
  -H "Content-Type: application/json" \
  -d '{
    "googleId": "test123",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

---

## Troubleshooting

### PostgreSQL Connection Error
```bash
# Check if PostgreSQL is running
psql -U postgres

# If error, start PostgreSQL service:
# Windows: Services > PostgreSQL > Start
```

### pgvector Extension Not Found
```bash
# Reinstall extension
psql -U postgres -d attention_system -c "DROP EXTENSION IF EXISTS vector"
psql -U postgres -d attention_system -c "CREATE EXTENSION pgvector"
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Port 3000 Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID xxxx /F

# Or change PORT in .env file
```

### TypeScript Build Errors
```bash
# Clear node_modules and reinstall
rm -r node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

---

## Project Structure

```
d:\HackathonIITJ\code\
├── src/
│   ├── config/        # Database and Redis config
│   ├── types/         # TypeScript interfaces
│   ├── services/      # Business logic (9 services)
│   ├── controllers/   # Request handlers
│   ├── routes/        # API routes
│   ├── utils/         # Helpers and schedulers
│   ├── engines/       # Legacy (kept for reference)
│   └── index.ts       # Main entry point
├── dist/              # Compiled JavaScript (generated)
├── node_modules/      # Dependencies
├── package.json       # Project configuration
├── tsconfig.json      # TypeScript config
├── README.md          # Full documentation
├── API_REFERENCE.md   # API endpoint reference
├── IMPLEMENTATION_COMPLETE.md  # Completion report
└── .env.example       # Environment template
```

---

## Available Scripts

```bash
pnpm dev       # Start development server with hot reload
pnpm build     # Build TypeScript to JavaScript
pnpm start     # Run production build
pnpm test      # Run tests (not yet implemented)
```

---

## Key Features Recap

✅ Gmail & Google Classroom integration  
✅ LLM-based event extraction  
✅ RAG memory with pgvector embeddings  
✅ Smart priority scoring  
✅ Focus session scheduling  
✅ Daily/weekly plan generation  
✅ Context-aware suggestions  
✅ Distraction app interception  
✅ Widget data support  

---

## Next Steps

1. **Configure Google OAuth**
   - Create project in Google Cloud Console
   - Enable Gmail, Classroom, Calendar APIs
   - Create OAuth 2.0 credentials
   - Add credentials to .env

2. **Get LLM API Keys**
   - OpenAI: https://platform.openai.com/api-keys
   - Hugging Face: https://huggingface.co/settings/tokens

3. **Test Authentication**
   - Call /api/users/auth endpoint
   - Verify user is created in database

4. **Test Email Sync**
   - Call /api/users/sync endpoint
   - Check events are created and extracted

5. **Start Using API**
   - See API_REFERENCE.md for all endpoints
   - Use included cURL examples
   - Build frontend to consume API

---

## Performance Tips

1. **Database Queries**
   - Indexes created automatically on important fields
   - Use `/api/events/upcoming` for filtered results

2. **RAG Retrieval**
   - Top-k retrieval limits queries to 5 results
   - Cosine similarity search is fast with pgvector

3. **Background Jobs**
   - Email sync runs every 60 minutes
   - No blocking of user requests

4. **Caching**
   - Redis configured for future caching layer
   - Can add Redis caching in services layer

---

## Support & Documentation

- **README.md** - Full technical documentation
- **API_REFERENCE.md** - API endpoints and examples
- **IMPLEMENTATION_COMPLETE.md** - Feature completion report
- **Source Code** - Well-commented TypeScript code

---

## Production Deployment

When deploying to production:

1. Change NODE_ENV to production
2. Use strong DATABASE_URL with proper credentials
3. Enable HTTPS for OAuth callback
4. Use environment variables (not .env file)
5. Set up proper monitoring and logging
6. Configure CORS if frontend on different domain
7. Use production-grade Redis instance
8. Set up database backups

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:strong_password@prod-db:5432/attention_system
REDIS_URL=redis://user:password@prod-redis:6379
```

---

## Helpful Links

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Google APIs Documentation](https://developers.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

