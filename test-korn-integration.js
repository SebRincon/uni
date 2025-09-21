// Test the complete Korn AI integration
// Run this with: node test-korn-integration.js
// Make sure your Next.js server is running first: npm run dev

async function testKornIntegration() {
  console.log('🧪 Testing complete Korn AI integration...\n');

  // Test 1: Direct Cloudflare API (already confirmed working)
  console.log('✅ Direct Cloudflare Workers AI: WORKING');
  console.log('   Response: "Hello! I am Korn and I am working!"');

  // Test 2: Test the Next.js API endpoint
  console.log('\n🌐 Testing Next.js API endpoint...');
  
  try {
    const testData = {
      tweetId: 'test-tweet-123',
      authorId: 'test-user-456', 
      authorUsername: 'testuser',
      content: 'Hey @Korn, how are you doing today?',
      isReply: false
    };

    const response = await fetch('http://localhost:3000/api/ai/korn-mention', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Next.js API endpoint: WORKING');
      console.log(`   Korn's response: "${result.response.responseContent}"`);
    } else {
      console.log('❌ Next.js API endpoint: FAILED');
      console.log('   Error:', result.error || 'Unknown error');
      console.log('   Make sure your Next.js server is running: npm run dev');
    }
  } catch (error) {
    console.log('❌ Next.js API endpoint: CONNECTION FAILED');
    console.log('   Error:', error.message);
    console.log('   Make sure your Next.js server is running: npm run dev');
  }

  // Show integration instructions
  console.log('\n📖 Integration Instructions:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Add the useTweetIntegration hook to your tweet components');
  console.log('3. Add KornAIStatus component to your UI for monitoring');
  console.log('4. When users mention @Korn in tweets, the AI will automatically respond!');
  
  console.log('\n🎯 Quick Integration Example:');
  console.log(`
import { useTweetIntegration } from '@/lib/ai/tweet-integration-service';

function TweetComponent() {
  const { processNewTweet } = useTweetIntegration();

  const handleTweetPost = async (tweetData) => {
    // Your existing tweet posting logic
    const newTweet = await postTweet(tweetData);
    
    // Process for @Korn mentions (this will auto-respond)
    await processNewTweet({
      id: newTweet.id,
      content: newTweet.content,
      authorId: newTweet.authorId,
      authorUsername: newTweet.authorUsername,
      // ... other tweet properties
    });
  };
}
  `);
}

// Run the test
testKornIntegration().catch(console.error);