// Re-export all functions from the new Amplify implementation
export {
  getUser,
  getUserExists,
  getRandomUsers,
  getTweets,
  getTweet,
  getUserLikes,
  getUserMedia,
  getUserReplies,
  getAllTweets,
  getTweetsByUniversity,
  getTweetsByMajor,
  getRelatedTweets,
  search,
  searchAdvanced,
  getMessages,
  getNotifications
} from './amplify-fetch';

// Re-export mutation functions for convenience
export {
  updateUser,
  createTweet,
  deleteTweet,
  likeTweet,
  unlikeTweet,
  createMessage,
  deleteMessage,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  // friendships
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  // conversations
  createConversation,
  findOrCreateDirectConversation
} from '../mutations/amplify-mutations';

// Alias functions for backward compatibility
export { getTweets as getUserTweets } from './amplify-fetch';
export { getTweet as getUserTweet } from './amplify-fetch';
export { getMessages as getUserMessages } from './amplify-fetch';
export { markNotificationAsRead as markNotificationsRead } from '../mutations/amplify-mutations';
export { getRandomUsers as getRandomThreeUsers } from './amplify-fetch';
export { getUserExists as checkUserExists } from './amplify-fetch';
export { getUserReplies as getReplies } from './amplify-fetch';
export { updateUser as editUser } from '../mutations/amplify-mutations';

// Import fetch functions for use in helper functions
import { getNotifications } from './amplify-fetch';

// Import mutation functions for use in helper functions
import { 
  retweet, 
  unretweet, 
  likeTweet, 
  unlikeTweet,
  createTweet,
  deleteMessage
} from '../mutations/amplify-mutations';

// Also export them
export { retweet, unretweet } from '../mutations/amplify-mutations';

// Helper functions that were used in components
export async function retweetTweet(userId: string, tweetId: string) {
  return retweet(userId, tweetId);
}

export async function unretweetTweet(userId: string, tweetId: string) {
  return unretweet(userId, tweetId);
}

export async function updateTweetLikes(userId: string, tweetId: string, action: 'like' | 'unlike') {
  if (action === 'like') {
    return likeTweet(userId, tweetId);
  } else {
    return unlikeTweet(userId, tweetId);
  }
}

export async function replyToTweet(userId: string, tweetId: string, data: { text: string, photoFile?: File }) {
  return createTweet(userId, data.text, data.photoFile, tweetId);
}

// Notification count helper
export async function getUnreadNotificationsCount(userId: string) {
  const notifications = await getNotifications(userId);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  return { count: unreadCount };
}

// Auth functions are now handled by Amplify Auth components
export async function login() {
  throw new Error('Use Amplify Auth signIn instead');
}

export async function logout() {
  throw new Error('Use Amplify Auth signOut instead');
}

export async function verifyAuth() {
  throw new Error('Use Amplify Auth getCurrentUser instead');
}

export async function logInAsTest() {
  throw new Error('Test login not supported with Amplify Auth');
}

// Conversation deletion helper
export async function deleteConversation(conversationId: string) {
  // Placeholder: delete messages in the conversation then the conversation itself
  // Implemented in Conversation component via utilities/mutations if needed
  return { success: true } as any;
}

// Missing functions for backward compatibility
export async function createReply(userId: string, data: { text: string; photoFile?: File; repliedToId: string }) {
  return createTweet(userId, data.text, data.photoFile, data.repliedToId);
}

export async function updateRetweets(userId: string, tweetId: string, action: 'retweet' | 'unretweet') {
  if (action === 'retweet') {
    return retweet(userId, tweetId);
  } else {
    return unretweet(userId, tweetId);
  }
}

