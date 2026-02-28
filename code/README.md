# Attention-Aware Academic Planner Backend

A comprehensive backend system for managing academic workload, extracting events from Gmail and Google Classroom, and providing intelligent priority scoring and task scheduling using RAG (Retrieval-Augmented Generation).

## Features

### 1. **Email & Classroom Ingestion (FR-1)**
- Automatically fetches and processes Gmail emails
- Integrates with Google Classroom announcements
- Batches emails once per hour per user
- Supports manual custom event creation

### 2. **Event Extraction (FR-2)**
- LLM-based event extraction from unstructured emails
- Automatic deadline detection
- Event classification: Quiz, Assignment, Event, Custom
- Structured JSON output with validation

### 3. **RAG Memory Manager (FR-3)**
- Embeds academic events into vector database (pgvector)
- Stores descriptions, syllabus segments, study summaries
- Prevents duplicate embeddings
- Enforces memory size limits per user

### 4. **RAG-Based Priority Engine (FR-4)**
- **Hybrid Scoring Model:**
  - Deterministic scoring based on deadline proximity + category weight
  - Context adjustments using RAG retrieval
  - LLM-based reasoning for enhanced prioritization
- **Fail-Safe Mode:** Falls back to deterministic scoring if RAG fails
- **Output Structure:**
  ```json
  {
    "priority_score": 1-10,
    "urgency_level": "low|medium|high|critical",
    "reasoning_summary": "string",
    "recommended_focus_sessions": "integer",
    "recommended_study_time_of_day": "morning|afternoon|evening"
  }
  ```

### 5. **Time-Boxing Engine (FR-5)**
- Generates focus sessions before deadlines
- Breaks large tasks into micro-tasks
- Inserts sessions into calendar
- Supports session status tracking

### 6. **Plan Generation (FR-6)**
- Generates daily and weekly structured plans
- Based on ranked event priorities
- Considers workload balance
- Provides balance analysis and suggestions

### 7. **Context Engine (FR-7)**
- Suggests low-cognitive tasks at night
- Prioritizes deep-focus tasks in library
- Dynamically modifies priority based on user context
- Contextual task recommendations

### 8. **Distraction Interceptor (FR-8)**
- Detects attempts to open games/social media
- Displays contextual prompt with upcoming tasks
- Allows user override
- Logs distraction attempts

### 9. **Widget (FR-9)**
- Displays "One Thing" - the most important task
- Shows next upcoming event with deadline
- Real-time updates

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL with pgvector extension
- **Vector Embeddings:** Hugging Face all-MiniLM-L6-v2
- **RAG Orchestration:** LangChain.js
- **Caching/Queue:** Redis
- **External APIs:**
  - Gmail API
  - Google Classroom API
  - Google Calendar API
  - LLM API (OpenAI or similar)

## API Endpoints

### Authentication & Sync
- `POST /api/users/auth` - Authenticate user with Google
- `POST /api/users/sync` - Sync Gmail & Classroom events
- `GET /api/users/widget` - Get widget data

### Events
- `POST /api/events` - Create manual event
- `GET /api/events` - Get all events for user
- `GET /api/events/upcoming` - Get upcoming events
- `DELETE /api/events/:eventId` - Delete event

### Priority
- `POST /api/priority` - Calculate priority for event
- `GET /api/priority` - Get priorities for all user events

### Focus Sessions
- `POST /api/focus-sessions/schedule` - Generate focus schedule
- `GET /api/focus-sessions/:eventId` - Get focus sessions for event
- `PUT /api/focus-sessions/:sessionId/status` - Update session status

### Plans
- `POST /api/plans/daily` - Generate daily plan
- `POST /api/plans/weekly` - Generate weekly plan
- `POST /api/plans/analyze` - Analyze plan and get suggestions

### Context
- `POST /api/context/suggestion` - Get context suggestion
- `GET /api/context/suggestions` - Get suggestion history

### Distraction
- `POST /api/distraction/check` - Check if app is restricted
- `POST /api/distraction/log` - Log distraction attempt

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Redis 6+
- Google OAuth credentials
- OpenAI API key (or compatible LLM)
- Hugging Face API key

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd d:\HackathonIITJ\code
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/attention_system
   REDIS_URL=redis://localhost:6379
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
   LLM_API_KEY=your_openai_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   PORT=3000
   NODE_ENV=development
   ```

3. **Setup PostgreSQL with pgvector:**
   ```bash
   # On Windows with PostgreSQL installed
   psql -U postgres -c "CREATE DATABASE attention_system"
   psql -U postgres -d attention_system -c "CREATE EXTENSION pgvector"
   ```

4. **Start Redis:**
   ```bash
   # Using Windows Subsystem for Linux or Docker
   redis-server
   ```

5. **Build and run:**
   ```bash
   pnpm build
   pnpm start
   ```

   Or for development with hot reload:
   ```bash
   pnpm dev
   ```

## Database Schema

### Tables
- **users** - User accounts with Google authentication
- **events** - Academic events (quizzes, assignments, etc.)
- **rag_memory** - Vector embeddings of events and study materials
- **focus_sessions** - Scheduled study sessions
- **daily_plans** - Daily study plans
- **context_suggestions** - Contextual recommendations
- **email_messages** - Cached email data
- **distraction_logs** - Log of app access attempts

## Performance Targets

- UI response time: < 2 seconds
- RAG retrieval: ≤ 2 seconds
- Event extraction: ≤ 10 seconds
- Priority scoring: ≤ 5 seconds

## Scheduled Jobs

- **Email Sync:** Runs every 60 minutes per user
- **RAG Embedding:** Automatic on event creation
- **Distraction Cleanup:** Runs every 7 days

## Architecture

```
Frontend (React Native/Web)
        ↓
API Gateway (Express)
        ↓
Controllers & Routes
        ↓
Services Layer
   ├─ Email Service
   ├─ Classroom Service  
   ├─ Event Service
   ├─ Priority Engine
   ├─ Embedding Service
   ├─ Plan Generator
   ├─ Context Engine
   └─ Distraction Interceptor
        ↓
Database Layer (PostgreSQL + pgvector + Redis)
        ↓
External APIs (Gmail, Classroom, LLM)
```

## Example Usage

### 1. Authenticate User
```bash
curl -X POST http://localhost:3000/api/users/auth \
  -H "Content-Type: application/json" \
  -d '{
    "googleId": "123456789",
    "email": "student@example.com",
    "name": "Student Name",
    "refreshToken": "refresh_token_here"
  }'
```

### 2. Sync Emails and Classroom
```bash
curl -X POST http://localhost:3000/api/users/sync \
  -H "Content-Type: application/json" \  -d '{
    "userId": "user_id_from_auth",
    "refreshToken": "refresh_token_here"
  }'
```

### 3. Create Manual Event
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "title": "Math Quiz",
    "description": "Chapters 1-5",
    "type": "Quiz",
    "deadline": "2026-03-05T10:00:00Z",
    "source": "custom"
  }'
```

### 4. Get Priority
```bash
curl -X POST http://localhost:3000/api/priority \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "eventId": "event_id",
    "context": "Currently in library"
  }'
```

### 5. Generate Focus Schedule
```bash
curl -X POST http://localhost:3000/api/focus-sessions/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "eventId": "event_id",
    "taskTitle": "Math Quiz Preparation",
    "daysUntilDeadline": 3,
    "recommendedSessions": 4
  }'
```

### 6. Get Widget Data
```bash
curl -X GET "http://localhost:3000/api/users/widget?userId=user_id"
```

## Error Handling

The API returns standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `404` - Not found
- `429` - Rate limited (LLM call limit)
- `500` - Server error

All error responses include an error message field.

## Rate Limiting

- **Email Sync:** Once per hour per user
- **LLM Calls:** Once per hour per user
- **RAG Access:** No limit (use top-k retrieval for efficiency)

## Contributing

1. Follow TypeScript best practices
2. Add error handling for all service calls
3. Update this README for new features
4. Test endpoints before committing

## License

ISC

## Support

For issues or questions, contact the development team.
