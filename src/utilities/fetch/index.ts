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
  getRelatedTweets,
  search,
  getMessages,
  getNotifications
} from './amplify-fetch';

// Re-export mutation functions for convenience
export {
  updateUser,
  followUser,
  unfollowUser,
  createTweet,
  deleteTweet,
  likeTweet,
  unlikeTweet,
  retweet,
  unretweet,
  createMessage,
  deleteMessage,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../mutations/amplify-mutations';

// Alias functions for backward compatibility
export { getTweets as getUserTweets } from './amplify-fetch';
export { getTweet as getUserTweet } from './amplify-fetch';
export { getMessages as getUserMessages } from './amplify-fetch';
export { markNotificationAsRead as markNotificationsRead } from '../mutations/amplify-mutations';
export { getRandomUsers as getRandomThreeUsers } from './amplify-fetch';
export { getUserExists as checkUserExists } from './amplify-fetch';

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
  // In the new model, we would need to delete all messages in a conversation
  // This is a placeholder - implement based on your conversation model
  return deleteMessage(conversationId);
}