# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a medical consultation web application (许庚医生 - 耳鼻喉AI助手) built with Next.js 15, React 19, and TypeScript. The application provides an AI-powered ENT (Ear, Nose, and Throat) consultation service that mimics the conversational style of Dr. Xu Geng, a specialist with 30 years of experience.

**Key Features:**
- Real-time AI chat consultation with streaming responses
- Voice input support (speech-to-text)
- Image upload for symptom visualization
- Symptom self-assessment tools
- Consultation history tracking in localStorage
- Mobile-first responsive design

**AI Provider:** The app uses 字节跳动的豆包 (Doubao) API for both chat completions and speech-to-text transcription, NOT DeepSeek (despite the README mentioning DeepSeek - this is outdated information).

## Commands

### Development
```bash
npm run dev
```
Starts the development server at http://localhost:3000

### Production Build
```bash
npm run build
```
Builds the application for production

### Production Start
```bash
npm run start
```
Starts the production server (must run `npm run build` first)

### Installation
```bash
npm install
```
Installs all dependencies

## Environment Configuration

Required environment variables in `.env.local`:

```
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_MODEL_ID=your_model_id_here
```

**Important:** This app uses Doubao (字节跳动) API, not DeepSeek. The Doubao API endpoint is `https://ark.cn-beijing.volces.com/api/v3/`.

## Architecture

### Application Structure

```
app/
├── api/
│   ├── chat/route.ts        # Streaming chat API with Doubao
│   └── speech/route.ts      # Speech-to-text API with Doubao Audio
├── layout.tsx               # Root layout with metadata
├── page.tsx                 # Main chat interface (client component)
└── globals.css             # Global styles

components/
└── OptimizedChatInput.tsx  # Reusable input component (not currently used in main app)
```

### Key Technical Patterns

**API Routes:**
- `/api/chat` - Handles streaming chat completions using Server-Sent Events (SSE)
- `/api/speech` - Handles audio file uploads and returns transcribed text

**State Management:**
- Uses React's built-in `useState` and `useEffect` hooks
- No external state management library
- Persistent storage via `localStorage` for chat history and current session

**Data Flow:**
1. User sends message (text + optional images)
2. Message added to state and saved to localStorage
3. API call made to `/api/chat` with full message history
4. Response streams back character by character
5. UI updates incrementally as tokens arrive

### Client-Side Image Processing

Images are compressed before sending:
1. Maximum size: 5MB per file
2. Resized to max dimension of 1024px
3. Converted to JPEG with 0.7 quality
4. Base64 encoded for API transmission

This reduces bandwidth and API costs while maintaining acceptable quality for medical image analysis.

### AI System Prompt

The chat API uses a system prompt that instructs the AI to:
- Act as Dr. Xu Geng with 30 years of ENT experience
- Use a friendly, conversational tone (like chatting with a friend)
- Keep responses short (2-3 sentences at a time)
- Use natural spoken language with colloquialisms
- Avoid bullet points and numbered lists
- Recommend in-person visits for serious cases

**Location:** `app/api/chat/route.ts:18-20`

### Streaming Implementation

The chat API uses Next.js ReadableStream to handle Server-Sent Events:
1. Doubao API returns streaming response with `data:` prefixed lines
2. Each line is parsed to extract delta content
3. Content chunks are encoded and enqueued to the stream
4. Client reads stream progressively and updates UI

**Key Pattern:** The response is decoded incrementally on both server and client to provide real-time feedback.

## React Best Practices

This codebase follows React best practices as defined in `.skills/react-best-practices/AGENTS.md`. Key patterns to maintain:

### Critical Patterns
- **Bundle Size:** Avoid barrel imports (though this app has minimal dependencies)
- **Waterfalls:** API calls are properly handled, but be careful when adding new data fetching
- **Server Components:** Currently using client-side rendering exclusively; consider server components for future optimization

### Implemented Patterns
- **Functional setState:** Used in `page.tsx` for message updates to avoid stale closures
- **Lazy State Init:** Used in `page.tsx:32-33` for localStorage reads
- **Passive Event Listeners:** Applied to scroll tracking
- **Early Returns:** Used throughout for validation and error handling

### Accessibility
The `OptimizedChatInput.tsx` component demonstrates proper accessibility patterns:
- All interactive elements have `aria-label` attributes
- Form inputs have associated labels (using `.sr-only` for visual hiding)
- Images have meaningful `alt` text
- Semantic HTML with proper roles

When adding new UI components, follow these accessibility standards.

## Known Patterns to Maintain

### LocalStorage Usage
- `currentChat`: Stores active conversation messages
- `chatHistory`: Array of past consultation sessions with id, messages, and date
- Pattern: Always wrap in try-catch (can throw in incognito mode)
- Pattern: Save on every state update to prevent data loss

### Voice Input Flow
1. User clicks mic button
2. Request browser microphone permission
3. Record audio as webm blob
4. Convert to base64
5. Send to `/api/chat` endpoint (not `/api/speech` - the speech route appears to be unused)
6. AI recognizes speech and returns text
7. Text is inserted into input field

**Note:** The current implementation sends audio to the chat endpoint with special prompt, not to the dedicated speech endpoint.

## Common Development Tasks

### Adding a New Feature View
The app uses a tab-based navigation system with three views: 'chat', 'symptom', 'history'. To add a new view:
1. Add new view type to the union in `page.tsx:23`
2. Add nav button in the `<nav>` section
3. Add conditional rendering in `<main>` section
4. Ensure mobile responsiveness with proper `max-w-*` classes

### Modifying AI Behavior
Edit the system prompt in `app/api/chat/route.ts:18-20`. Keep it concise and conversational.

### Adjusting Image Compression
Modify the compression logic in `page.tsx:204-233`:
- Change `maxSize` constant for different max dimensions
- Adjust quality parameter in `canvas.toDataURL('image/jpeg', 0.7)`
- Update size limit check in line 194

## Testing & Quality Assurance

**No automated tests are currently configured.** When adding tests:
1. Install testing framework (e.g., `npm install -D vitest @testing-library/react`)
2. Add test scripts to `package.json`
3. Focus on testing: API route logic, image compression, message state management

## Styling & Design

- **CSS Framework:** Tailwind CSS with Typography plugin
- **Design System:** Mobile-first with responsive breakpoints (`sm:`, etc.)
- **Color Palette:** Blue gradients for primary UI, white cards with shadows
- **Font:** System fonts (no custom fonts loaded)

### Key Design Patterns
- Gradient header: `from-blue-600 to-blue-700`
- Message bubbles: User (blue bg) vs Assistant (white bg)
- Rounded corners: `rounded-2xl` for messages, `rounded-lg` for inputs
- Shadow levels: `shadow-sm`, `shadow-md`, `shadow-lg` for depth hierarchy

## Important Notes

1. **API Keys:** Never commit `.env.local` - it's already in `.gitignore`
2. **Chinese Language:** All UI text is in Chinese; maintain consistency when adding features
3. **Mobile First:** Always test responsive behavior, especially the fixed header/footer layout
4. **Error Handling:** API errors show user-friendly Chinese messages, technical errors logged to console
5. **Code Style:** Follow existing TypeScript patterns - explicit types, arrow functions, destructuring

## File Size Considerations

The `app/page.tsx` file is substantial (350+ lines). When refactoring:
- Consider extracting message rendering into separate component
- Move voice recording logic into custom hook
- Separate image processing utilities into `lib/` directory

## Additional Resources

- React Best Practices: `.skills/react-best-practices/AGENTS.md`
- Next.js 15 Docs: https://nextjs.org/docs
- Doubao API Docs: Check Bytedance's official documentation
