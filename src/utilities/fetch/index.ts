const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

type FetchOptions = RequestInit & {
  next?: { revalidate: number };
};

async function fetchWrapper(url: string, options?: FetchOptions) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// User-related fetch functions
export async function getUser(username: string) {
  return fetchWrapper(`/api/users/${username}`, {
    next: { revalidate: 60 }
  });
}

export async function getUserExists(username: string) {
  return fetchWrapper(`/api/users/exists?username=${username}`, {
    next: { revalidate: 60 }
  });
}

export async function getRandomUsers() {
  return fetchWrapper('/api/users/random', {
    next: { revalidate: 3600 }
  });
}

// Tweet-related fetch functions
export async function getTweets(username: string) {
  return fetchWrapper(`/api/tweets/${username}`, {
    next: { revalidate: 60 }
  });
}

export async function getTweet(username: string, tweetId: string) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}`, {
    next: { revalidate: 60 }
  });
}

export async function getUserLikes(username: string) {
  return fetchWrapper(`/api/tweets/${username}/likes`, {
    next: { revalidate: 60 }
  });
}

export async function getUserMedia(username: string) {
  return fetchWrapper(`/api/tweets/${username}/media`, {
    next: { revalidate: 60 }
  });
}

export async function getUserReplies(username: string) {
  return fetchWrapper(`/api/tweets/${username}/replies`, {
    next: { revalidate: 60 }
  });
}

export async function getAllTweets() {
  return fetchWrapper('/api/tweets/all', {
    next: { revalidate: 60 }
  });
}

export async function getRelatedTweets(tweetId: string) {
  return fetchWrapper(`/api/tweets/related?tweetId=${tweetId}`, {
    next: { revalidate: 60 }
  });
}

// Search-related fetch functions
export async function search(query: string) {
  return fetchWrapper(`/api/search?query=${encodeURIComponent(query)}`, {
    next: { revalidate: 60 }
  });
}

// Message-related fetch functions
export async function getMessages(username: string) {
  return fetchWrapper(`/api/messages/${username}`, {
    next: { revalidate: 60 }
  });
}

// Notification-related fetch functions
export async function getNotifications() {
  return fetchWrapper('/api/notifications', {
    next: { revalidate: 60 }
  });
}

export async function getUnreadNotificationsCount() {
  return fetchWrapper('/api/notifications?count=true', {
    next: { revalidate: 60 }
  });
}

// Action functions (POST, PUT, DELETE)
export async function createUser(data: any) {
  return fetchWrapper('/api/users/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(username: string, data: any) {
  return fetchWrapper(`/api/users/${username}/edit`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function followUser(username: string) {
  return fetchWrapper(`/api/users/${username}/follow`, {
    method: 'POST',
  });
}

export async function unfollowUser(username: string) {
  return fetchWrapper(`/api/users/${username}/unfollow`, {
    method: 'POST',
  });
}

export async function createTweet(data: any) {
  return fetchWrapper('/api/tweets/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTweet(username: string, tweetId: string) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}/delete`, {
    method: 'DELETE',
  });
}

export async function likeTweet(username: string, tweetId: string) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}/like`, {
    method: 'POST',
  });
}

export async function unlikeTweet(username: string, tweetId: string) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}/unlike`, {
    method: 'POST',
  });
}

export async function retweetTweet(username: string, tweetId: string) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}/retweet`, {
    method: 'POST',
  });
}

export async function unretweetTweet(username: string, tweetId: string) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}/unretweet`, {
    method: 'POST',
  });
}

export async function replyToTweet(username: string, tweetId: string, data: any) {
  return fetchWrapper(`/api/tweets/${username}/${tweetId}/reply`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createMessage(data: any) {
  return fetchWrapper('/api/messages/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteMessage(messageId: string) {
  return fetchWrapper('/api/messages/delete', {
    method: 'DELETE',
    body: JSON.stringify({ messageId }),
  });
}

export async function markNotificationAsRead(notificationId: string) {
  return fetchWrapper('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationId }),
  });
}

export async function login(data: any) {
  return fetchWrapper('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function logout() {
  return fetchWrapper('/api/auth/logout', {
    method: 'POST',
  });
}

export async function verifyAuth() {
  return fetchWrapper('/api/auth/verify', {
    method: 'POST',
  });
}

// Additional exports needed by components
export async function getUserTweets(username: string) {
  return getTweets(username);
}

export async function getUserTweet(username: string, tweetId: string) {
  return getTweet(username, tweetId);
}

export async function getUserMessages(username: string) {
  return getMessages(username);
}

export async function markNotificationsRead(notificationId: string) {
  return markNotificationAsRead(notificationId);
}

export async function logInAsTest() {
  return login({ username: 'test', password: 'test123' });
}

export async function checkUserExists(username: string) {
  return getUserExists(username);
}

export async function deleteConversation(conversationId: string) {
  return deleteMessage(conversationId);
}

export async function getRandomThreeUsers() {
  return getRandomUsers();
}

export async function updateTweetLikes(username: string, tweetId: string, action: 'like' | 'unlike') {
  if (action === 'like') {
    return likeTweet(username, tweetId);
  } else {
    return unlikeTweet(username, tweetId);
  }
}

export async function createReply(username: string, tweetId: string, data: any) {
  return replyToTweet(username, tweetId, data);
}

export async function getReplies(tweetId: string) {
  return getRelatedTweets(tweetId);
}

export async function updateRetweets(username: string, tweetId: string, action: 'retweet' | 'unretweet') {
  if (action === 'retweet') {
    return retweetTweet(username, tweetId);
  } else {
    return unretweetTweet(username, tweetId);
  }
}

export async function editUser(username: string, data: any) {
  return updateUser(username, data);
}

export async function updateFollows(username: string, action: 'follow' | 'unfollow') {
  if (action === 'follow') {
    return followUser(username);
  } else {
    return unfollowUser(username);
  }
}

export async function deleteTweetAction(username: string, tweetId: string) {
  return deleteTweet(username, tweetId);
}

export async function createNotification(data: any) {
  return fetchWrapper('/api/notifications/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}