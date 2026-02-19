# Backend API Integration Guide

This document explains how the frontend Vue.js application connects to the FastAPI backend.

## API Configuration

### Base URL
The API base URL is configured via environment variable:
- **Environment Variable**: `VITE_API_BASE_URL`
- **Default**: `http://localhost:8000`
- **API Prefix**: `/api/v1` (automatically appended)

Example `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### API Service (`src/services/api.ts`)
The centralized HTTP client handles:
- **Authentication**: Automatically adds JWT token to all requests
- **Token Refresh**: Automatically refreshes expired tokens
- **Error Handling**: Transforms errors to consistent format
- **Retry Logic**: Retries transient failures (408, 429, 500, 502, 503, 504)
- **Timeout**: 30 seconds default

## Chat API Integration

### Endpoints

#### 1. Initialize Chat Session
**Frontend**: `chatService.initSession()`
**Backend**: `POST /api/v1/chat/init`

**Request**:
```typescript
{
  user_id: string,      // Automatically fetched from /auth/me
  language: string,     // Default: 'en'
  initial_context: {}   // Optional context data
}
```

**Response**:
```typescript
{
  session_id: string,
  user_id: string,
  language: string,
  welcome_message: string,
  timestamp: string
}
```

#### 2. Send Message
**Frontend**: `chatService.sendMessage(request)`
**Backend**: `POST /api/v1/chat/message`

**Request**:
```typescript
{
  session_id: string,
  message: string,
  language?: string,    // Optional, default: 'en'
  metadata?: object     // Optional metadata
}
```

**Response**:
```typescript
{
  message_id: string,
  role: string,         // 'assistant'
  content: string,      // Response text
  language: string,
  timestamp: string,
  sources?: string[],   // Source citations
  metadata?: object
}
```

#### 3. Get Chat History
**Frontend**: `chatService.getHistory(sessionId, limit?)`
**Backend**: `GET /api/v1/chat/{session_id}/history`

**Query Parameters**:
- `limit`: Number of messages to retrieve (default: 50)
- `offset`: Pagination offset (default: 0)

**Response**:
```typescript
{
  session_id: string,
  messages: Array<{
    message_id: string,
    role: string,
    content: string,
    language: string,
    timestamp: string,
    sources?: string[],
    metadata?: object
  }>,
  total_messages: number
}
```

#### 4. Upload Image for Disease Detection
**Frontend**: `chatService.uploadImage(sessionId, image)`
**Backend**: `POST /api/v1/chat/upload-image`

**Request** (multipart/form-data):
```typescript
{
  session_id: string,
  language: string,
  image: File           // Image file
}
```

**Response**:
```typescript
{
  message_id: string,
  disease_info: {
    disease_name?: string,
    confidence?: number,
    severity?: string,
    description?: string
  },
  treatment_recommendations: string[],
  sources: string[],
  language: string,
  timestamp: string
}
```

#### 5. End Chat Session
**Frontend**: `chatService.endSession(sessionId)`
**Backend**: `DELETE /api/v1/chat/{session_id}`

**Response**: 204 No Content

## Authentication Flow

### Getting Current User
The chat service automatically fetches the current user ID when initializing a session:

```typescript
// Internal method in chatService
private async getCurrentUserId(): Promise<string> {
  const response = await apiService.get<{ id: string }>('/auth/me');
  return response.id;
}
```

**Backend Endpoint**: `GET /api/v1/auth/me`

### Token Management
1. **Token Storage**: JWT token stored in `localStorage` as `token`
2. **Token Injection**: Automatically added to all requests via `Authorization: Bearer <token>` header
3. **Token Refresh**: Automatically refreshed when 401 response received
4. **Token Expiration**: Redirects to login when refresh fails

## Data Transformation

### Sources Format
Backend returns sources as string array, frontend transforms to objects:

**Backend**:
```typescript
sources: ["Source 1", "Source 2"]
```

**Frontend**:
```typescript
sources: [
  { title: "Source 1", relevance_score: 1.0 },
  { title: "Source 2", relevance_score: 1.0 }
]
```

### Disease Detection Response
Backend returns structured disease info, frontend formats into readable markdown:

**Backend**:
```typescript
{
  disease_info: { disease_name: "Leaf Blight", confidence: 0.95 },
  treatment_recommendations: ["Apply fungicide", "Remove affected leaves"]
}
```

**Frontend** (formatted as markdown):
```markdown
**Disease Identified:** Leaf Blight

**Confidence:** 95.0%

**Treatment Recommendations:**
1. Apply fungicide
2. Remove affected leaves
```

## Error Handling

### API Errors
All API errors are transformed to consistent format:

```typescript
interface ApiError {
  code: string,        // e.g., "HTTP_404", "NETWORK_ERROR"
  message: string,     // Human-readable error message
  details?: unknown    // Additional error details
}
```

### Common Error Codes
- `HTTP_401`: Unauthorized (token expired/invalid)
- `HTTP_404`: Resource not found (session not found)
- `HTTP_500`: Internal server error
- `NETWORK_ERROR`: Network connection issue
- `REQUEST_ERROR`: Request configuration error

### Error Handling in Components
```typescript
try {
  await chatStore.sendMessage(message);
} catch (error) {
  // Error is automatically set in store.error
  // Display error to user via UI
}
```

## Testing

### Mock Service
Tests use mocked chat service:

```typescript
vi.mock('@/services/chat.service', () => ({
  chatService: {
    initSession: vi.fn(),
    sendMessage: vi.fn(),
    getHistory: vi.fn(),
    endSession: vi.fn(),
    uploadImage: vi.fn(),
  },
}));
```

### Running Tests
```bash
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Run tests with UI
```

## Environment Setup

### Development
1. Create `.env` file in `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

2. Start backend server:
```bash
cd ..
uvicorn app.main:app --reload
```

3. Start frontend dev server:
```bash
npm run dev
```

### Production
Set environment variable in deployment:
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

Build frontend:
```bash
npm run build
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure backend has proper CORS configuration:

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Authentication Errors
1. Check token is stored in localStorage: `localStorage.getItem('token')`
2. Verify token is valid: Check `/api/v1/auth/me` endpoint
3. Check token expiration and refresh logic

### Network Errors
1. Verify backend is running: `curl http://localhost:8000/api/v1/health`
2. Check API base URL in `.env` file
3. Verify network connectivity

## Next Steps

1. **Implement other services**: Weather, Market, Schemes, etc.
2. **Add WebSocket support**: For real-time notifications
3. **Implement offline mode**: Cache responses for offline access
4. **Add request cancellation**: Cancel pending requests on navigation
5. **Implement request deduplication**: Prevent duplicate requests
