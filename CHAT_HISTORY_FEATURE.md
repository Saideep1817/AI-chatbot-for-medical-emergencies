# Chat History Persistence Feature

## Overview
This feature implements persistent chat history storage in MongoDB with the ability to load previous conversations and clear chat history (current session or all sessions).

## Features Implemented

### 1. **Database Model** (`models/ChatHistory.ts`)
- Stores chat messages per user and session
- Schema includes:
  - `userId`: User identifier
  - `sessionId`: Unique session identifier
  - `messages`: Array of message objects (id, content, role, timestamp)
  - Timestamps for creation and updates
- Indexed for efficient queries

### 2. **API Endpoints**

#### **POST `/api/chat`** (Updated)
- Saves each user message and AI response to MongoDB
- Associates messages with user ID and session ID
- Continues to work even if database save fails (non-blocking)

#### **GET `/api/chat-history`**
- Fetch chat history for the current user
- Query parameters:
  - `sessionId` (optional): Get specific session
  - No params: Get all sessions for user
- Returns chat history with all messages

#### **DELETE `/api/chat-history`**
- Clear chat history
- Query parameters:
  - `sessionId` (optional): Delete specific session
  - No params: Delete all sessions for user
- Requires user authentication

### 3. **Client Features** (`components/ChatClient.tsx`)

#### **Session Management**
- Generates unique session ID on first visit
- Stores session ID in localStorage
- Automatically loads chat history on mount
- Persists across page refreshes

#### **Auto-Load History**
- When user returns, previous chat is automatically loaded
- Falls back to welcome message if no history exists
- Handles errors gracefully

#### **Clear Chat UI**
- Trash icon button in header
- Dropdown menu with two options:
  1. **Clear Current Chat**: Deletes current session and starts fresh
  2. **Clear All History**: Deletes all user's chat sessions
- Confirmation dialogs prevent accidental deletion
- Click-outside to close menu

## User Flow

### First Visit
1. User opens chat
2. New session ID generated and stored in localStorage
3. Welcome message displayed
4. All messages saved to MongoDB

### Returning User
1. User opens chat
2. Session ID retrieved from localStorage
3. Chat history loaded from MongoDB
4. Previous conversation displayed
5. User can continue conversation

### Clearing Chat
1. User clicks trash icon in header
2. Dropdown menu appears with options
3. User selects "Clear Current Chat" or "Clear All History"
4. Confirmation dialog appears
5. If confirmed:
   - Chat history deleted from MongoDB
   - New session created
   - Fresh welcome message displayed
   - localStorage updated with new session ID

## Technical Details

### Session ID Format
```
session-{timestamp}
```
Example: `session-1729421234567`

### Message Structure
```typescript
{
  id: string;           // Unique message ID
  content: string;      // Message text
  role: 'user' | 'assistant';
  timestamp: Date;      // When message was sent
}
```

### Database Schema
```typescript
{
  userId: string;       // User identifier
  sessionId: string;    // Session identifier
  messages: Message[];  // Array of messages
  createdAt: Date;      // Auto-generated
  updatedAt: Date;      // Auto-generated
}
```

### Storage Locations
- **MongoDB**: Persistent storage for all chat history
- **localStorage**: Current session ID only
- **React State**: Current messages for display

## Error Handling

1. **Database Connection Failure**
   - Chat continues to work without persistence
   - Error logged to console
   - User experience not affected

2. **Load History Failure**
   - Falls back to welcome message
   - Error logged to console
   - User can start new conversation

3. **Clear History Failure**
   - Alert shown to user
   - User can retry
   - Current state preserved

## Security

- All endpoints require authentication via NextAuth
- User can only access their own chat history
- Session-based isolation prevents cross-user data access
- Confirmation dialogs prevent accidental deletion

## Future Enhancements

Potential improvements:
1. Multiple chat sessions with sidebar navigation
2. Search within chat history
3. Export chat history as PDF/text
4. Archive old sessions instead of deleting
5. Share specific conversations
6. Chat history analytics (message count, topics, etc.)

## Testing

### Test Scenarios

1. **New User**
   - Open chat → Should see welcome message
   - Send messages → Should be saved to DB
   - Refresh page → Should load previous messages

2. **Clear Current Chat**
   - Click trash icon → Menu appears
   - Click "Clear Current Chat" → Confirmation dialog
   - Confirm → New session starts with welcome message

3. **Clear All History**
   - Click trash icon → Menu appears
   - Click "Clear All History" → Confirmation dialog
   - Confirm → All sessions deleted, new session starts

4. **Database Offline**
   - Disconnect MongoDB
   - Send messages → Should work (not saved)
   - Reconnect → New messages saved

## Files Modified/Created

### Created
- `models/ChatHistory.ts` - Database model
- `app/api/chat-history/route.ts` - API endpoints for history
- `CHAT_HISTORY_FEATURE.md` - This documentation

### Modified
- `app/api/chat/route.ts` - Added save to database
- `components/ChatClient.tsx` - Added load/clear functionality

## Dependencies

No new dependencies required. Uses existing:
- `mongoose` - MongoDB ODM
- `next-auth` - Authentication
- React hooks - State management
