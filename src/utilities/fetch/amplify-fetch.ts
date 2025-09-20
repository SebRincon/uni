// @ts-nocheck
import { client } from '@/lib/amplify-client';
import { SelectionSet } from 'aws-amplify/data';
import type { Schema } from '@/lib/amplify-client';

type User = any; // Models['User']['type'];
type Tweet = any; // Models['Tweet']['type'];
type Message = any; // Models['Message']['type'];
type Notification = any; // Models['Notification']['type'];

// Selection sets for complex queries
const userSelectionSet = ['username', 'name', 'description', 'location', 
  'website', 'photoUrl', 'headerUrl', 'isPremium', 'createdAt', 'updatedAt'] as const;

const tweetSelectionSet = ['id', 'text', 'photoUrl', 'isRetweet', 'isReply', 
  'createdAt', 'updatedAt', 'authorId', 'retweetOfId', 'repliedToId'] as const;

// User-related fetch functions
export async function getUser(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: userSelectionSet
    });
    
    if (!users || users.length === 0) {
      throw new Error('User not found');
    }
    
    const user = users[0];
    
    // Get followers and following counts
    const { data: followers } = await client.models.UserFollows.list({
      filter: { followingId: { eq: user.username } }
    });
    
    const { data: following } = await client.models.UserFollows.list({
      filter: { followerId: { eq: user.username } }
    });
    
    return {
      ...user,
      id: user.username, // Add id field for compatibility
      followers: followers || [],
      following: following || []
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function getUserExists(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: ['username']
    });
    
    return { exists: users && users.length > 0 };
  } catch (error) {
    console.error('Error checking user existence:', error);
    return { exists: false };
  }
}

export async function getRandomUsers(limit: number = 5) {
  try {
    // Note: DynamoDB doesn't support random selection, so we'll get all users
    // and randomly select some. For production, consider a different approach.
    const { data: allUsers } = await client.models.User.list({
      selectionSet: userSelectionSet
    });
    
    if (!allUsers || allUsers.length === 0) {
      return [];
    }
    
    // Shuffle and take first 'limit' users
    const shuffled = [...allUsers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit).map(user => ({
      ...user,
      id: user.username // Add id field for compatibility
    }));
  } catch (error) {
    console.error('Error fetching random users:', error);
    return [];
  }
}

// Tweet-related fetch functions
export async function getTweets(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: ['username']
    });
    
    if (!users || users.length === 0) {
      return [];
    }
    
    const userId = users[0].username;
    
    const { data: tweets } = await client.models.Tweet.list({
      filter: {
        and: [
          { authorId: { eq: userId } },
          { isReply: { ne: true } }
        ]
      },
      selectionSet: tweetSelectionSet,
      sortDirection: 'DESC'
    });
    
    // Fetch author details for each tweet
    const tweetsWithAuthors = await Promise.all(
      (tweets || []).map(async (tweet) => {
        const { data: author } = await client.models.User.get(
          { username: tweet.authorId },
          { selectionSet: userSelectionSet }
        );
        return { ...tweet, author: { ...author, id: author?.username } };
      })
    );
    
    return tweetsWithAuthors;
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return [];
  }
}

export async function getTweet(username: string, tweetId: string) {
  try {
    const { data: tweet } = await client.models.Tweet.get(
      { username: tweetId },
      { selectionSet: tweetSelectionSet }
    );
    
    if (!tweet) {
      throw new Error('Tweet not found');
    }
    
    // Get author details
    const { data: author } = await client.models.User.get(
      { username: tweet.authorId },
      { selectionSet: userSelectionSet }
    );
    
    // Get likes count
    const { data: likes } = await client.models.UserLikes.list({
      filter: { tweetId: { eq: tweetId } }
    });
    
    // Get retweets count
    const { data: retweets } = await client.models.UserRetweets.list({
      filter: { tweetId: { eq: tweetId } }
    });
    
    // Get replies
    const { data: replies } = await client.models.Tweet.list({
      filter: { repliedToId: { eq: tweetId } },
      selectionSet: tweetSelectionSet
    });
    
    return {
      ...tweet,
      author,
      likeCount: likes?.length || 0,
      retweetCount: retweets?.length || 0,
      replyCount: replies?.length || 0,
      replies
    };
  } catch (error) {
    console.error('Error fetching tweet:', error);
    throw error;
  }
}

export async function getUserLikes(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: ['username']
    });
    
    if (!users || users.length === 0) {
      return [];
    }
    
    const userId = users[0].username;
    
    // Get user's liked tweet IDs
    const { data: userLikes } = await client.models.UserLikes.list({
      filter: { userId: { eq: userId } },
      selectionSet: ['tweetId', 'createdAt']
    });
    
    if (!userLikes || userLikes.length === 0) {
      return [];
    }
    
    // Fetch the actual tweets
    const likedTweets = await Promise.all(
      userLikes.map(async (like) => {
        const { data: tweet } = await client.models.Tweet.get(
          { username: like.tweetId },
          { selectionSet: tweetSelectionSet }
        );
        
        if (tweet) {
          const { data: author } = await client.models.User.get(
            { username: tweet.authorId },
            { selectionSet: userSelectionSet }
          );
          return { ...tweet, author: { ...author, id: author?.username }, likedAt: like.createdAt };
        }
        return null;
      })
    );
    
    return likedTweets.filter(Boolean);
  } catch (error) {
    console.error('Error fetching user likes:', error);
    return [];
  }
}

export async function getUserMedia(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: ['username']
    });
    
    if (!users || users.length === 0) {
      return [];
    }
    
    const userId = users[0].username;
    
    const { data: tweets } = await client.models.Tweet.list({
      filter: {
        and: [
          { authorId: { eq: userId } },
          { photoUrl: { ne: null } }
        ]
      },
      selectionSet: tweetSelectionSet,
      sortDirection: 'DESC'
    });
    
    // Fetch author details for each tweet
    const tweetsWithAuthors = await Promise.all(
      (tweets || []).map(async (tweet) => {
        const { data: author } = await client.models.User.get(
          { username: tweet.authorId },
          { selectionSet: userSelectionSet }
        );
        return { ...tweet, author: { ...author, id: author?.username } };
      })
    );
    
    return tweetsWithAuthors;
  } catch (error) {
    console.error('Error fetching user media:', error);
    return [];
  }
}

export async function getUserReplies(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: ['username']
    });
    
    if (!users || users.length === 0) {
      return [];
    }
    
    const userId = users[0].username;
    
    const { data: tweets } = await client.models.Tweet.list({
      filter: {
        and: [
          { authorId: { eq: userId } },
          { isReply: { eq: true } }
        ]
      },
      selectionSet: tweetSelectionSet,
      sortDirection: 'DESC'
    });
    
    // Fetch author details and parent tweets for each reply
    const tweetsWithDetails = await Promise.all(
      (tweets || []).map(async (tweet) => {
        const { data: author } = await client.models.User.get(
          { username: tweet.authorId },
          { selectionSet: userSelectionSet }
        );
        
        let repliedTo = null;
        if (tweet.repliedToId) {
          const { data: parentTweet } = await client.models.Tweet.get(
            { username: tweet.repliedToId },
            { selectionSet: tweetSelectionSet }
          );
          if (parentTweet) {
            const { data: parentAuthor } = await client.models.User.get(
              { username: parentTweet.authorId },
              { selectionSet: userSelectionSet }
            );
            repliedTo = { ...parentTweet, author: parentAuthor };
          }
        }
        
        return { ...tweet, author: { ...author, id: author?.username }, repliedTo };
      })
    );
    
    return tweetsWithDetails;
  } catch (error) {
    console.error('Error fetching user replies:', error);
    return [];
  }
}

export async function getAllTweets(limit: number = 50) {
  try {
    const { data: tweets } = await client.models.Tweet.list({
      filter: { isReply: { ne: true } },
      selectionSet: tweetSelectionSet,
      sortDirection: 'DESC',
      limit
    });
    
    // Fetch author details for each tweet
    const tweetsWithAuthors = await Promise.all(
      (tweets || []).map(async (tweet) => {
        const { data: author } = await client.models.User.get(
          { username: tweet.authorId },
          { selectionSet: userSelectionSet }
        );
        
        // Get interaction counts
        const [likes, retweets] = await Promise.all([
          client.models.UserLikes.list({ filter: { tweetId: { eq: tweet.id } } }),
          client.models.UserRetweets.list({ filter: { tweetId: { eq: tweet.id } } })
        ]);
        
        return {
          ...tweet,
          author,
          likeCount: likes.data?.length || 0,
          retweetCount: retweets.data?.length || 0
        };
      })
    );
    
    return tweetsWithAuthors;
  } catch (error) {
    console.error('Error fetching all tweets:', error);
    return [];
  }
}

export async function getRelatedTweets(tweetId: string) {
  try {
    // Get the original tweet
    const { data: originalTweet } = await client.models.Tweet.get(
      { username: tweetId },
      { selectionSet: tweetSelectionSet }
    );
    
    if (!originalTweet) {
      return [];
    }
    
    // Get tweets from the same author
    const { data: authorTweets } = await client.models.Tweet.list({
      filter: {
        and: [
          { authorId: { eq: originalTweet.authorId } },
          { id: { ne: tweetId } },
          { isReply: { ne: true } }
        ]
      },
      selectionSet: tweetSelectionSet,
      limit: 10,
      sortDirection: 'DESC'
    });
    
    // Fetch author details for each tweet
    const tweetsWithAuthors = await Promise.all(
      (authorTweets || []).map(async (tweet) => {
        const { data: author } = await client.models.User.get(
          { username: tweet.authorId },
          { selectionSet: userSelectionSet }
        );
        return { ...tweet, author: { ...author, id: author?.username } };
      })
    );
    
    return tweetsWithAuthors;
  } catch (error) {
    console.error('Error fetching related tweets:', error);
    return [];
  }
}

// Search function (basic implementation)
export async function search(query: string) {
  try {
    // Search users
    const { data: users } = await client.models.User.list({
      filter: {
        or: [
          { username: { contains: query.toLowerCase() } },
          { name: { contains: query } }
        ]
      },
      selectionSet: userSelectionSet,
      limit: 10
    });
    
    // Search tweets
    const { data: tweets } = await client.models.Tweet.list({
      filter: {
        text: { contains: query }
      },
      selectionSet: tweetSelectionSet,
      limit: 20,
      sortDirection: 'DESC'
    });
    
    // Fetch author details for tweets
    const tweetsWithAuthors = await Promise.all(
      (tweets || []).map(async (tweet) => {
        const { data: author } = await client.models.User.get(
          { username: tweet.authorId },
          { selectionSet: userSelectionSet }
        );
        return { ...tweet, author: { ...author, id: author?.username } };
      })
    );
    
    return {
      users: users || [],
      tweets: tweetsWithAuthors
    };
  } catch (error) {
    console.error('Error searching:', error);
    return { users: [], tweets: [] };
  }
}

// Message-related fetch functions
export async function getMessages(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: ['username']
    });
    
    if (!users || users.length === 0) {
      return [];
    }
    
    const userId = users[0].username;
    
    // Get messages where user is sender or recipient with full sender/recipient data
    const [sent, received] = await Promise.all([
      client.models.Message.list({
        filter: { senderId: { eq: userId } },
        selectionSet: [
          'id', 
          'text', 
          'photoUrl', 
          'createdAt', 
          'senderId', 
          'recipientId',
          'sender.username',
          'sender.name',
          'sender.photoUrl',
          'sender.isPremium',
          'recipient.username',
          'recipient.name', 
          'recipient.photoUrl',
          'recipient.isPremium'
        ]
      }),
      client.models.Message.list({
        filter: { recipientId: { eq: userId } },
        selectionSet: [
          'id', 
          'text', 
          'photoUrl', 
          'createdAt', 
          'senderId', 
          'recipientId',
          'sender.username',
          'sender.name',
          'sender.photoUrl',
          'sender.isPremium',
          'recipient.username',
          'recipient.name', 
          'recipient.photoUrl',
          'recipient.isPremium'
        ]
      })
    ]);
    
    const allMessages = [...(sent.data || []), ...(received.data || [])];
    
    // Group messages by conversation
    const conversations = new Map();
    
    for (const message of allMessages) {
      const otherUserId = message.senderId === userId ? message.recipientId : message.senderId;
      
      if (!conversations.has(otherUserId)) {
        const { data: otherUser } = await client.models.User.get(
          { username: otherUserId },
          { selectionSet: userSelectionSet }
        );
        
        conversations.set(otherUserId, {
          user: { ...otherUser, id: otherUser?.username },
          messages: []
        });
      }
      
      conversations.get(otherUserId).messages.push(message);
    }
    
    // Sort messages within each conversation (oldest first)
    for (const conversation of conversations.values()) {
      conversation.messages.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    
    return Array.from(conversations.values());
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Notification-related fetch functions
export async function getNotifications(userId: string) {
  try {
    const { data: notifications } = await client.models.Notification.list({
      filter: { userId: { eq: userId } },
      selectionSet: [
        'id', 
        'type', 
        'content', 
        'isRead', 
        'createdAt',
        'user.id',
        'user.username',
        'user.name',
        'user.photoUrl',
        'user.headerUrl',
        'user.description',
        'user.location',
        'user.website',
        'user.isPremium'
      ],
      sortDirection: 'DESC'
    });
    
    return notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}