// @ts-nocheck
import { client } from '@/lib/amplify-client';
import { uploadData } from 'aws-amplify/storage';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '@/lib/amplify-client';

type User = any; // Models['User']['type'];
type Tweet = any; // Models['Tweet']['type'];
type Message = any; // Models['Message']['type'];
type Notification = any; // Models['Notification']['type'];

// Helper function to upload media files
async function uploadMedia(file: File): Promise<string | null> {
  try {
    // Get the current auth session to obtain the identity ID
    const { identityId } = await fetchAuthSession();
    
    if (!identityId) {
      console.error('No identity ID found');
      return null;
    }
    
    // Use the correct path format with the Cognito identity ID
    const fileName = `media/${identityId}/${Date.now()}-${file.name}`;
    const result = await uploadData({
      path: fileName,
      data: file,
      options: {
        contentType: file.type
      }
    }).result;
    
    return result.path;
  } catch (error) {
    console.error('Error uploading media:', error);
    return null;
  }
}

// User mutations
export async function updateUser(userId: string, updates: Partial<User>) {
  try {
    // Handle photo uploads if provided
    if (updates.photoUrl && updates.photoUrl instanceof File) {
      const photoPath = await uploadMedia(updates.photoUrl as any);
      updates.photoUrl = photoPath || undefined;
    }
    
    if (updates.headerUrl && updates.headerUrl instanceof File) {
      const headerPath = await uploadMedia(updates.headerUrl as any);
      updates.headerUrl = headerPath || undefined;
    }
    
    const { data } = await client.models.User.update({
      username: userId, // username is the primary key
      ...updates
    });
    
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}



// Helper to call server-side moderation
async function moderateClientSide(text: string): Promise<{ isSensitive: boolean; block: boolean; overallSeverity: string; categories: any[] }> {
  try {
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error('Moderation API error', await res.text());
      // Fail-closed for safety: mark as sensitive but do not block
      return { isSensitive: true, block: false, overallSeverity: 'low', categories: [] };
    }
    return await res.json();
  } catch (e) {
    console.error('Moderation call failed', e);
    // Fail-closed for safety: mark as sensitive but do not block
    return { isSensitive: true, block: false, overallSeverity: 'low', categories: [] };
  }
}

// Tweet mutations
export async function createTweet(
  authorId: string,
  text: string,
  photoFile?: File,
  repliedToId?: string
) {
  try {
    let photoUrl: string | undefined;
    
    if (photoFile) {
      photoUrl = await uploadMedia(photoFile) || undefined;
    }
    
    // Pre-publish moderation
    const mod = await moderateClientSide(text);
    if (mod.block) {
      throw new Error('Message blocked by content policy');
    }

    const { data } = await client.models.Tweet.create({
      authorId,
      text,
      photoUrl,
      isReply: !!repliedToId,
      repliedToId,
      isRetweet: false,
      isSensitive: mod.isSensitive
    });
    
    // Create notification for reply
    if (repliedToId && data) {
      const { data: originalTweet } = await client.models.Tweet.get({ id: repliedToId });
      if (originalTweet && originalTweet.authorId !== authorId) {
        // Get author user details for notification
        const { data: authorUser } = await client.models.User.get({ username: authorId });
        
        await createNotification(
          originalTweet.authorId,
          'reply',
          JSON.stringify({
            sender: {
              username: authorUser?.username || authorId,
              name: authorUser?.name || '',
              photoUrl: authorUser?.photoUrl || ''
            },
            content: {
              id: data.id
            }
          })
        );
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error creating tweet:', error);
    throw error;
  }
}

export async function deleteTweet(tweetId: string) {
  try {
    // First delete all likes
    const { data: likes } = await client.models.UserLikes.list({
      filter: { tweetId: { eq: tweetId } }
    });
    
    for (const like of likes || []) {
      await client.models.UserLikes.delete({ id: like.id });
    }
    
    // Delete all retweets
    const { data: retweets } = await client.models.UserRetweets.list({
      filter: { tweetId: { eq: tweetId } }
    });
    
    for (const retweet of retweets || []) {
      await client.models.UserRetweets.delete({ id: retweet.id });
    }
    
    // Delete the tweet
    const { data } = await client.models.Tweet.delete({ id: tweetId });
    
    return data;
  } catch (error) {
    console.error('Error deleting tweet:', error);
    throw error;
  }
}

export async function likeTweet(userId: string, tweetId: string) {
  try {
    // Check if already liked
    const { data: existing } = await client.models.UserLikes.list({
      filter: {
        and: [
          { userId: { eq: userId } },
          { tweetId: { eq: tweetId } }
        ]
      }
    });
    
    if (existing && existing.length > 0) {
      return { success: false, message: 'Already liked' };
    }
    
    const { data } = await client.models.UserLikes.create({
      userId,
      tweetId
    });
    
    // Create notification
    const { data: tweet } = await client.models.Tweet.get({ id: tweetId });
    if (tweet && tweet.authorId !== userId) {
      // Get liker user details for notification
      const { data: likerUser } = await client.models.User.get({ username: userId });
      
      await createNotification(
        tweet.authorId,
        'like',
        JSON.stringify({
          sender: {
            username: likerUser?.username || userId,
            name: likerUser?.name || '',
            photoUrl: likerUser?.photoUrl || ''
          },
          content: {
            id: tweetId
          }
        })
      );
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error liking tweet:', error);
    throw error;
  }
}

export async function unlikeTweet(userId: string, tweetId: string) {
  try {
    const { data: existing } = await client.models.UserLikes.list({
      filter: {
        and: [
          { userId: { eq: userId } },
          { tweetId: { eq: tweetId } }
        ]
      }
    });
    
    if (!existing || existing.length === 0) {
      return { success: false, message: 'Not liked' };
    }
    
    const { data } = await client.models.UserLikes.delete({
      id: existing[0].id
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Error unliking tweet:', error);
    throw error;
  }
}

export async function retweet(userId: string, tweetId: string) {
  try {
    // Check if already retweeted
    const { data: existing } = await client.models.UserRetweets.list({
      filter: {
        and: [
          { userId: { eq: userId } },
          { tweetId: { eq: tweetId } }
        ]
      }
    });
    
    if (existing && existing.length > 0) {
      return { success: false, message: 'Already retweeted' };
    }
    
    // Create retweet record
    const { data: retweetRecord } = await client.models.UserRetweets.create({
      userId,
      tweetId
    });
    
    // Create retweet tweet
    const { data: originalTweet } = await client.models.Tweet.get({ id: tweetId });
    if (!originalTweet) {
      throw new Error('Original tweet not found');
    }
    
    const { data: retweetTweet } = await client.models.Tweet.create({
      authorId: userId,
      text: originalTweet.text,
      photoUrl: originalTweet.photoUrl,
      isRetweet: true,
      retweetOfId: tweetId,
      isReply: false,
      isSensitive: Boolean((originalTweet as any).isSensitive)
    });
    
    // Create notification
    if (originalTweet.authorId !== userId) {
      // Get retweeter user details for notification
      const { data: retweeterUser } = await client.models.User.get({ username: userId });
      
      await createNotification(
        originalTweet.authorId,
        'retweet',
        JSON.stringify({
          sender: {
            username: retweeterUser?.username || userId,
            name: retweeterUser?.name || '',
            photoUrl: retweeterUser?.photoUrl || ''
          },
          content: {
            id: tweetId
          }
        })
      );
    }
    
    return { success: true, data: { retweetRecord, retweetTweet } };
  } catch (error) {
    console.error('Error retweeting:', error);
    throw error;
  }
}

export async function unretweet(userId: string, tweetId: string) {
  try {
    const { data: existing } = await client.models.UserRetweets.list({
      filter: {
        and: [
          { userId: { eq: userId } },
          { tweetId: { eq: tweetId } }
        ]
      }
    });
    
    if (!existing || existing.length === 0) {
      return { success: false, message: 'Not retweeted' };
    }
    
    // Delete retweet record
    await client.models.UserRetweets.delete({
      id: existing[0].id
    });
    
    // Delete retweet tweet
    const { data: retweetTweets } = await client.models.Tweet.list({
      filter: {
        and: [
          { authorId: { eq: userId } },
          { retweetOfId: { eq: tweetId } },
          { isRetweet: { eq: true } }
        ]
      }
    });
    
    for (const retweetTweet of retweetTweets || []) {
      await client.models.Tweet.delete({ id: retweetTweet.id });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error unretweeting:', error);
    throw error;
  }
}

// Friendship helpers
function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function getFriendshipByPair(a: string, b: string) {
  const { data } = await client.models.Friendship.list({
    filter: { and: [ { userAId: { eq: a } }, { userBId: { eq: b } } ] }
  });
  return data || [];
}

export async function sendFriendRequest(requesterId: string, targetId: string) {
  try {
    const [a, b] = sortPair(requesterId, targetId);
    const existing = await getFriendshipByPair(a, b);
    if (existing.length > 0) return { success: false, message: 'Already related' };
    const { data } = await client.models.Friendship.create({
      userAId: a,
      userBId: b,
      requesterId,
      status: 'pending'
    });
    // Notify target
    await createNotification(
      targetId,
      'friend_request',
      JSON.stringify({ sender: { username: requesterId } })
    );
    return { success: true, data };
  } catch (e) {
    console.error('Error sending friend request:', e);
    throw e;
  }
}

export async function cancelFriendRequest(requesterId: string, targetId: string) {
  try {
    const [a, b] = sortPair(requesterId, targetId);
    const existing = await getFriendshipByPair(a, b);
    const pending = (existing || []).find(f => f.status === 'pending' && f.requesterId === requesterId);
    if (!pending) return { success: false };
    await client.models.Friendship.delete({ id: pending.id });
    return { success: true };
  } catch (e) {
    console.error('Error canceling friend request:', e);
    throw e;
  }
}

export async function acceptFriendRequest(userId: string, otherId: string) {
  try {
    const [a, b] = sortPair(userId, otherId);
    const existing = await getFriendshipByPair(a, b);
    const pending = (existing || []).find(f => f.status === 'pending' && f.requesterId !== userId);
    if (!pending) return { success: false };
    const { data } = await client.models.Friendship.update({ id: pending.id, status: 'accepted' });
    // Notify requester
    await createNotification(
      otherId,
      'friend_accept',
      JSON.stringify({ sender: { username: userId } })
    );
    return { success: true, data };
  } catch (e) {
    console.error('Error accepting friend request:', e);
    throw e;
  }
}

export async function declineFriendRequest(userId: string, otherId: string) {
  try {
    const [a, b] = sortPair(userId, otherId);
    const existing = await getFriendshipByPair(a, b);
    const pending = (existing || []).find(f => f.status === 'pending' && f.requesterId !== userId);
    if (!pending) return { success: false };
    await client.models.Friendship.delete({ id: pending.id });
    return { success: true };
  } catch (e) {
    console.error('Error declining friend request:', e);
    throw e;
  }
}

export async function removeFriend(userId: string, otherId: string) {
  try {
    const [a, b] = sortPair(userId, otherId);
    const existing = await getFriendshipByPair(a, b);
    const accepted = (existing || []).find(f => f.status === 'accepted');
    if (!accepted) return { success: false };
    await client.models.Friendship.delete({ id: accepted.id });
    return { success: true };
  } catch (e) {
    console.error('Error removing friend:', e);
    throw e;
  }
}

// Conversations
export async function createConversation(creatorId: string, memberIds: string[], name?: string) {
  try {
    const unique = Array.from(new Set([creatorId, ...memberIds]));
    if (unique.length > 5) throw new Error('Max 5 participants per group');
    const { data: conv } = await client.models.Conversation.create({ name: name || null, createdBy: creatorId });
    // Add members
    for (const uid of unique) {
      await client.models.ConversationMember.create({ conversationId: conv!.id, userId: uid });
    }
    return conv;
  } catch (e) {
    console.error('Error creating conversation:', e);
    throw e;
  }
}

export async function findOrCreateDirectConversation(userA: string, userB: string) {
  try {
    // Get conversations where userA is a member
    const { data: memberships } = await client.models.ConversationMember.list({ filter: { userId: { eq: userA } } });
    for (const m of memberships || []) {
      const { data: members } = await client.models.ConversationMember.list({ filter: { conversationId: { eq: m.conversationId } } });
      const ids = (members || []).map(mm => mm.userId);
      if (ids.length === 2 && ids.includes(userB)) {
        const { data: conv } = await client.models.Conversation.get({ id: m.conversationId });
        return conv;
      }
    }
    // Create if not found
    return await createConversation(userA, [userB]);
  } catch (e) {
    console.error('Error finding/creating direct conversation:', e);
    throw e;
  }
}

// Message mutations
export async function createMessage(
  conversationId: string,
  senderId: string,
  text: string,
  photoFile?: File
) {
  try {
    let photoUrl: string | undefined;
    if (photoFile) {
      photoUrl = await uploadMedia(photoFile) || undefined;
    }
    const { data } = await client.models.Message.create({
      conversationId,
      senderId,
      text,
      photoUrl
    });
    return data;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

export async function deleteMessage(messageId: string) {
  try {
    const { data } = await client.models.Message.delete({ id: messageId });
    return data;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

// Notification mutations
export async function createNotification(
  userId: string,
  type: string,
  content: string
) {
  try {
    const { data } = await client.models.Notification.create({
      userId,
      type,
      content,
      isRead: false
    });
    
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { data } = await client.models.Notification.update({
      id: notificationId,
      isRead: true
    });
    
    return data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data: notifications } = await client.models.Notification.list({
      filter: {
        and: [
          { userId: { eq: userId } },
          { isRead: { eq: false } }
        ]
      }
    });
    
    const updates = await Promise.all(
      (notifications || []).map((notification) =>
        client.models.Notification.update({
          id: notification.id,
          isRead: true
        })
      )
    );
    
    return updates;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}