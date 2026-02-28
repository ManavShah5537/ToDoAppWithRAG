# API Quick Reference Guide

## Base URL
```
http://localhost:3000
```

## Authentication Endpoint
### Authenticate User
```bash
POST /api/users/auth
Content-Type: application/json

{
  "googleId": "string",
  "email": "string",
  "name": "string",
  "refreshToken": "string"
}

Response: { User object with ID }
```

## Event Management

### Create Event
```bash
POST /api/events
{
  "userId": "string",
  "title": "string",
  "description": "string",
  "type": "Quiz|Assignment|Event|Custom",
  "deadline": "ISO date string",
  "source": "custom|gmail|classroom|calendar",
  "sourceId": "optional string"
}
```

### Get All Events
```bash
GET /api/events?userId=string
```

### Get Upcoming Events
```bash
GET /api/events/upcoming?userId=string&days=7
```

### Delete Event
```bash
DELETE /api/events/:eventId
```

## Priority Management

### Calculate Priority for Single Event
```bash
POST /api/priority
{
  "userId": "string",
  "eventId": "string",
  "context": "optional string"
}

Response:
{
  "priority_score": 1-10,
  "urgency_level": "low|medium|high|critical",
  "reasoning_summary": "string",
  "recommended_focus_sessions": integer,
  "recommended_study_time_of_day": "morning|afternoon|evening"
}
```

### Get All Priorities for User
```bash
GET /api/priority?userId=string

Response: Array of priorities sorted by score (highest first)
```

## Focus Sessions & Time-Boxing

### Generate Focus Schedule
```bash
POST /api/focus-sessions/schedule
{
  "userId": "string",
  "eventId": "string",
  "taskTitle": "string",
  "daysUntilDeadline": integer,
  "recommendedSessions": integer
}
```

### Get Focus Sessions for Event
```bash
GET /api/focus-sessions/:eventId
```

### Update Session Status
```bash
PUT /api/focus-sessions/:sessionId/status
{
  "status": "scheduled|active|completed|skipped"
}
```

## Plan Generation

### Generate Daily Plan
```bash
POST /api/plans/daily
{
  "userId": "string",
  "planDate": "ISO date string"
}
```

### Generate Weekly Plan
```bash
POST /api/plans/weekly
{
  "userId": "string",
  "startDate": "ISO date string"
}
```

### Analyze Plan & Get Suggestions
```bash
POST /api/plans/analyze
{
  "userId": "string",
  "planDate": "ISO date string"
}
```

## Context Suggestions

### Get Context Suggestion
```bash
POST /api/context/suggestion
{
  "userId": "string",
  "eventId": "string",
  "userContext": {
    "currentTime": "ISO date string",
    "location": "library|home|café",
    "currentTask": "break|work|exercise",
    "recentlyAccessedApps": ["array of apps"],
    "calendarBusy": boolean,
    "workloadLevel": "low|medium|high"
  }
}
```

### Get Suggestion History
```bash
GET /api/context/suggestions?userId=string&limit=5
```

## Distraction Interceptor

### Check App Access
```bash
POST /api/distraction/check
{
  "userId": "string",
  "appName": "instagram|tiktok|facebook|twitter|youtube|reddit|games"
}

Response:
{
  "isRestricted": boolean,
  "message": "optional string",
  "nextEvent": "optional Event object"
}
```

### Log Distraction Attempt
```bash
POST /api/distraction/log
{
  "userId": "string",
  "appName": "string",
  "allowed": boolean
}
```

## User Sync & Widget

### Sync Gmail & Classroom
```bash
POST /api/users/sync
{
  "userId": "string",
  "refreshToken": "string"
}

Response:
{
  "emailsProcessed": integer,
  "announcementsProcessed": integer,
  "eventsExtracted": integer,
  "events": [array of created events]
}
```

### Get Widget Data
```bash
GET /api/users/widget?userId=string

Response:
{
  "oneThing": "string (most important task)",
  "nextEvent": {
    "id": "string",
    "title": "string",
    "deadline": "ISO date",
    "type": "Quiz|Assignment|Event|Custom",
    "daysUntilDeadline": integer
  }
}
```

## Health & Info

### Health Check
```bash
GET /health

Response: { "status": "ok", "timestamp": "ISO date" }
```

### API Information
```bash
GET /

Response: { name, version, status }
```

---

## Example Usage Workflow

```bash
# 1. Authenticate
POST http://localhost:3000/api/users/auth
→ Get userId

# 2. Sync emails and classroom
POST http://localhost:3000/api/users/sync
→ Events are extracted and created

# 3. Create custom event
POST http://localhost:3000/api/events
→ Create a manual task

# 4. Calculate priorities
GET http://localhost:3000/api/priority?userId=USER_ID
→ See all tasks ranked by importance

# 5. Generate focus schedule
POST http://localhost:3000/api/focus-sessions/schedule
→ Get study sessions with micro-tasks

# 6. Generate daily plan
POST http://localhost:3000/api/plans/daily
→ Get structured study plan

# 7. Get suggestions
POST http://localhost:3000/api/context/suggestion
→ Get context-aware recommendation

# 8. Check app access
POST http://localhost:3000/api/distraction/check
→ Get warning if trying to access distracting app

# 9. Get widget data
GET http://localhost:3000/api/users/widget?userId=USER_ID
→ Display next task and one thing to focus on
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limits

- **Email Sync**: 1 per hour per user
- **LLM Calls**: 1 per hour per user
- **Context Suggestions**: Unlimited
- **RAG Retrieval**: Unlimited (optimized)

---

## Authentication

All endpoints require `userId` parameter (obtained from `/api/users/auth`)

---

## Testing with cURL

```bash
# Test health
curl http://localhost:3000/health

# Test API info
curl http://localhost:3000/

# Authenticate user
curl -X POST http://localhost:3000/api/users/auth \
  -H "Content-Type: application/json" \
  -d '{
    "googleId": "123456",
    "email": "student@example.com",
    "name": "Student"
  }'

# Calculate priority
curl -X POST http://localhost:3000/api/priority \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "eventId": "EVENT_ID",
    "context": "In library"
  }'
```

---

## Data Types

### Event Types
- `Quiz` - Quiz event
- `Assignment` - Assignment due
- `Event` - General event (lecture, meeting, etc.)
- `Custom` - User-created task

### Urgency Levels
- `low` - Priority score 1-3
- `medium` - Priority score 4-6
- `high` - Priority score 7-8
- `critical` - Priority score 9-10

### Time of Day
- `morning` - 5:00 - 12:00
- `afternoon` - 12:00 - 17:00
- `evening` - 17:00 - 21:00

### Session Status
- `scheduled` - Session planned
- `active` - Currently in session
- `completed` - Session finished
- `skipped` - Session skipped

---

## Pagination (Not Implemented Yet)

Some endpoints support limit parameter:
```bash
GET /api/context/suggestions?userId=string&limit=10
```

Defaults to reasonable limits if not specified.

