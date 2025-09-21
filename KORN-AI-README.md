# 🤖 Korn AI - Cloudflare Workers AI Integration

## Overview

Korn AI is an intelligent assistant integrated into the Twitter-Local application that responds to @Korn mentions in tweets and replies. Similar to @Grok on X/Twitter, Korn provides AI-powered responses using Cloudflare Workers AI.

## Features

- 🎯 **Smart Mention Detection**: Automatically detects @Korn mentions in tweets and replies
- 🧠 **AI-Powered Responses**: Uses Cloudflare Workers AI for natural, conversational responses
- ⚡ **Real-time Processing**: Processes mentions and generates responses automatically
- 🛡️ **Rate Limiting**: Built-in rate limiting to prevent API abuse
- 🔧 **Configurable**: Easy to configure and customize AI behavior
- 📊 **Status Monitoring**: Real-time status monitoring and queue management
- 🎨 **UI Components**: Ready-to-use React components for integration

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tweet Posted  │───▶│  Mention Check  │───▶│   Korn AI API   │
│   with @Korn    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│  AI Response    │◀───│  Cloudflare AI  │◀────────────┘
│  Posted as      │    │   Workers API   │
│  Reply Tweet    │    │                 │
└─────────────────┘    └─────────────────┘
```

## Setup Instructions

### 1. Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.korn-ai.example .env.local
   ```

2. Get your Cloudflare credentials:
   - Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Go to "My Profile" → "API Tokens"
   - Create a token with "Workers AI:Read" permissions
   - Copy your Account ID from the dashboard

3. Update `.env.local` with your credentials:
   ```env
   KORN_AI_ENABLED=true
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_API_TOKEN=your-api-token
   CLOUDFLARE_AI_MODEL=@cf/meta/llama-2-7b-chat-int8
   ```

### 2. Installation

The Korn AI system is built using existing dependencies in the project. No additional packages need to be installed.

### 3. Integration with Your Tweet System

The system provides several integration options:

#### Option 1: Automatic Integration (Recommended)
Use the `useTweetIntegration` hook in your tweet posting components:

```typescript
import { useTweetIntegration } from '@/lib/ai/tweet-integration-service';

function TweetComponent() {
  const { processNewTweet } = useTweetIntegration();

  const handleTweetPost = async (tweetData) => {
    // Your existing tweet posting logic
    const newTweet = await postTweet(tweetData);
    
    // Process for @Korn mentions
    await processNewTweet({
      id: newTweet.id,
      content: newTweet.content,
      authorId: newTweet.authorId,
      authorUsername: newTweet.authorUsername,
      isReply: newTweet.isReply,
      parentTweetId: newTweet.parentTweetId,
      createdAt: newTweet.createdAt
    });
  };
}
```

#### Option 2: Manual API Integration
Call the API directly when tweets are posted:

```typescript
const response = await fetch('/api/ai/korn-mention', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tweetId: 'tweet-id',
    authorId: 'user-id',
    authorUsername: 'username',
    content: 'Hey @Korn, how are you?',
    isReply: false
  })
});
```

### 4. UI Integration

Add the Korn AI status component to your application:

```typescript
import { KornAIStatus, KornAIStatusCompact } from '@/components/ai/KornAIStatus';

// Full status display (for settings pages)
<KornAIStatus showDetails={true} />

// Compact status (for headers/navbars)
<KornAIStatusCompact />
```

## File Structure

```
src/
├── lib/ai/
│   ├── cloudflare-ai-service.ts     # Core AI service
│   ├── korn-mention-service.ts      # Mention processing
│   ├── korn-config.ts               # Configuration & initialization
│   └── tweet-integration-service.ts # Tweet system integration
├── hooks/
│   └── useKornAI.ts                 # React hooks for AI functionality
├── components/ai/
│   └── KornAIStatus.tsx             # Status & configuration UI
├── types/ai/
│   └── cloudflare-types.ts          # TypeScript type definitions
└── app/api/ai/
    └── korn-mention/route.ts        # API endpoint for processing mentions
```

## API Endpoints

### POST `/api/ai/korn-mention`
Process a tweet for @Korn mentions and generate AI response.

**Request Body:**
```json
{
  "tweetId": "string",
  "authorId": "string", 
  "authorUsername": "string",
  "content": "string",
  "isReply": false,
  "parentTweetId": "string?"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "id": "korn_response_id",
    "originalTweetId": "original_tweet_id",
    "responseContent": "AI generated response",
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "model": "cloudflare-workers-ai",
    "success": true
  }
}
```

### GET `/api/ai/korn-mention`
Get current Korn AI status and queue information.

## Configuration Options

The AI behavior can be customized through the configuration:

```typescript
const AI_CONFIG = {
  enabled: true,
  maxResponseLength: 280,        // Twitter character limit
  rateLimitPerMinute: 10,        // Requests per minute
  temperature: 0.7,              // AI creativity (0-1)
  systemPrompt: "Custom prompt..." // AI personality/instructions
};
```

## Available AI Models

Cloudflare Workers AI supports various models:

- `@cf/meta/llama-2-7b-chat-int8` (Default, good balance)
- `@cf/mistral/mistral-7b-instruct-v0.1` (Fast, instruction-following)
- `@cf/microsoft/dialoGPT-medium` (Conversational)

See [Cloudflare AI Models](https://developers.cloudflare.com/workers-ai/models/) for the full list.

## Monitoring and Debugging

### Status Monitoring
- Use `KornAIStatus` component to monitor real-time status
- Check processing queue and error states
- View last response timestamps

### Debug Logging
Enable detailed logging by setting:
```env
NODE_ENV=development
```

### API Testing
Test the AI system directly:
```bash
curl -X POST http://localhost:3000/api/ai/korn-mention \
  -H "Content-Type: application/json" \
  -d '{
    "tweetId": "test-123",
    "authorId": "user-456", 
    "authorUsername": "testuser",
    "content": "Hey @Korn, what time is it?"
  }'
```

## Rate Limiting and Error Handling

### Built-in Protections
- ✅ Rate limiting (10 requests/minute by default)
- ✅ Duplicate request prevention
- ✅ Fallback responses for API failures
- ✅ Graceful error handling
- ✅ Request timeout protection

### Error Recovery
- Automatic fallback messages when AI fails
- Retry logic for transient failures
- Queue management for high-traffic scenarios

## Security Considerations

### API Security
- Environment variables for sensitive credentials
- Request validation and sanitization
- Rate limiting to prevent abuse

### Content Safety
- Built-in content filtering in AI prompts
- Respectful and inclusive response guidelines
- No personal information sharing

## Troubleshooting

### Common Issues

1. **"AI service is currently disabled"**
   - Check `KORN_AI_ENABLED=true` in environment
   - Verify Cloudflare credentials

2. **"Rate limit exceeded"**
   - Wait 1 minute before retrying
   - Consider increasing rate limits in config

3. **"Failed to initialize Korn AI system"**
   - Verify `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
   - Check network connectivity to Cloudflare

4. **Responses not posting**
   - Verify tweet posting API integration
   - Check console for posting errors
   - Ensure proper authentication for tweet creation

### Debug Commands

Check AI status:
```bash
curl http://localhost:3000/api/ai/korn-mention
```

Test configuration:
```typescript
import { testKornAISetup } from '@/lib/ai/korn-config';
const isWorking = await testKornAISetup();
```

## Future Enhancements

- 🔄 Conversation threading support
- 🏷️ Hashtag and trending topic awareness  
- 📈 Analytics and usage metrics
- 🎨 Customizable AI personalities
- 🌐 Multi-language support
- 🔔 User notification preferences

## Contributing

When contributing to the Korn AI feature:

1. Follow existing code patterns and TypeScript types
2. Add appropriate error handling and logging
3. Update tests for new functionality
4. Document any configuration changes
5. Test with various mention patterns and edge cases

## License

This feature is part of the Twitter-Local project and follows the same licensing terms.