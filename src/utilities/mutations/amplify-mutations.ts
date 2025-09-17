import { client } from '@/lib/amplify-client';
import { uploadData } from 'aws-amplify/storage';
import type { Schema } from '@/amplify/data/resource';

type Models = Schema['']['models'];
type User = Models['User']['type'];
type Tweet = Models['Tweet']['type'];
type Message = Models['Message']['type'];
type Notification = Models['Notification']['type'];

// Helper function to upload media files
async function uploadMedia(file: File): Promise<string | null> {
  try {
    const fileName = `media/${Date.now()}-${file.name}`;
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
      id: userId,
      ...updates
    });
    
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function followUser(followerId: string, followingId: string) {
  try {
    // Check if already following
    const { data: existing } = await client.models.UserFollows.list({
      filter: {
        and: [
          { followerId: { eq: followerId } },
          { followingId: { eq: followingId } }
        ]
      }
    });
    
    if (existing && existing.length > 0) {
      return { success: false, message: 'Already following' };
    }
    
    const { data } = await client.models.UserFollows.create({
      followerId,
      followingId
    });
    
    // Create notification
    await createNotification(
      followingId,
      'follow',
      `@${followerId} started following you`
    );
    
    return { success: true, data };
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  try {
    const { data: existing } = await client.models.UserFollows.list({
      filter: {
        and: [
          { followerId: { eq: followerId } },
          { followingId: { eq: followingId } }
        ]
      }
    });
    
    if (!existing || existing.length === 0) {
      return { success: false, message: 'Not following' };
    }
    
    const { data } = await client.models.UserFollows.delete({
      id: existing[0].id
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
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
    
    const { data } = await client.models.Tweet.create({
      authorId,
      text,
      photoUrl,
      isReply: !!repliedToId,
      repliedToId,
      isRetweet: false
    });
    
    // Create notification for reply
    if (repliedToId && data) {
      const { data: originalTweet } = await client.models.Tweet.get({ id: repliedToId });
      if (originalTweet && originalTweet.authorId !== authorId) {
        await createNotification(
          originalTweet.authorId,
          'reply',
          `@${authorId} replied to your tweet`
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
      await createNotification(
        tweet.authorId,
        'like',
        `@${userId} liked your tweet`
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
      isReply: false
    });
    
    // Create notification
    if (originalTweet.authorId !== userId) {
      await createNotification(
        originalTweet.authorId,
        'retweet',
        `@${userId} retweeted your tweet`
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

// Message mutations
export async function createMessage(
  senderId: string,
  recipientId: string,
  text: string,
  photoFile?: File
) {
  try {
    let photoUrl: string | undefined;
    
    if (photoFile) {
      photoUrl = await uploadMedia(photoFile) || undefined;
    }
    
    const { data } = await client.models.Message.create({
      senderId,
      recipientId,
      text,
      photoUrl
    });
    
    // Create notification
    await createNotification(
      recipientId,
      'message',
      `You have a new message from @${senderId}`
    );
    
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