// @ts-nocheck
import { publicClient as client } from '@/lib/amplify-client';
import { SelectionSet } from 'aws-amplify/data';
import type { Schema } from '@/lib/amplify-client';

type User = any; // Models['User']['type'];
type Tweet = any; // Models['Tweet']['type'];
type Message = any; // Models['Message']['type'];
type Notification = any; // Models['Notification']['type'];

// Selection sets for complex queries
const userSelectionSet = ['username', 'name', 'description', 'location', 
  'website', 'photoUrl', 'headerUrl', 'isPremium', 'createdAt', 'updatedAt'] as const;

const tweetSelectionSet = ['id', 'text', 'photoUrl', 'isRetweet', 'isReply', 'isSensitive', 
  'createdAt', 'updatedAt', 'authorId', 'retweetOfId', 'repliedToId'] as const;

// User-related fetch functions
export async function getUser(username: string) {
  try {
    const { data: users } = await client.models.User.list({
      filter: { username: { eq: username } },
      selectionSet: userSelectionSet
    });
    
    if (!users || users.length === 0) {
      return null;
    }
    
    const user = users[0];

    const [friendshipsA, friendshipsB] = await Promise.all([
      client.models.Friendship.list({ filter: { userAId: { eq: user.username } } }),
      client.models.Friendship.list({ filter: { userBId: { eq: user.username } } }),
    ]);

    const allFriendships = [ ...(friendshipsA.data || []), ...(friendshipsB.data || []) ];

    async function getUserByUsername(u: string) {
      const { data: udata } = await client.models.User.get({ username: u }, { selectionSet: userSelectionSet });
      return udata ? { ...udata, id: udata.username } : null;
    }

    const friends: any[] = [];
    const pendingIncoming: any[] = [];
    const pendingOutgoing: any[] = [];

    for (const f of allFriendships) {
      const otherId = f.userAId === user.username ? f.userBId : f.userAId;
      const otherUser = await getUserByUsername(otherId);
      if (!otherUser) continue;
      if (f.status === 'accepted') friends.push(otherUser);
      else if (f.status === 'pending') {
        if (f.requesterId === user.username) pendingOutgoing.push(otherUser);
        else pendingIncoming.push(otherUser);
      }
    }

    return {
      ...user,
      id: user.username,
      friends,
      pendingIncoming,
      pendingOutgoing,
      isPremium: user.isPremium || false,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
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
      id: user.username, // Add id field for compatibility
      followers: [],
      following: [],
      isPremium: user.isPremium || false,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
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
      { id: tweetId },
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
    
    // Get likes
    const { data: likes } = await client.models.UserLikes.list({
      filter: { tweetId: { eq: tweetId } }
    });

    // Resolve likedBy users
    const likedBy = await Promise.all(
      (likes || []).map(async (like: any) => {
        const { data: user } = await client.models.User.get(
          { username: like.userId },
          { selectionSet: userSelectionSet }
        );
        return user ? { ...user, id: user.username } : null;
      })
    );
    
    // Get retweets
    const { data: retweets } = await client.models.UserRetweets.list({
      filter: { tweetId: { eq: tweetId } }
    });

    // Resolve retweetedBy users
    const retweetedBy = await Promise.all(
      (retweets || []).map(async (rt: any) => {
        const { data: user } = await client.models.User.get(
          { username: rt.userId },
          { selectionSet: userSelectionSet }
        );
        return user ? { ...user, id: user.username } : null;
      })
    );
    
    // Get replies (and hydrate with author and repliedTo.author)
    const { data: replies } = await client.models.Tweet.list({
      filter: { repliedToId: { eq: tweetId } },
      selectionSet: tweetSelectionSet
    });

    const repliesDetailed = await Promise.all(
      (replies || []).map(async (r: any) => {
        const { data: rAuthor } = await client.models.User.get(
          { username: r.authorId },
          { selectionSet: userSelectionSet }
        );
        const repliedTo = {
          id: tweet.id,
          author: author ? { ...author, id: author.username } : null,
        } as any;
        return {
          ...r,
          author: rAuthor ? { ...rAuthor, id: rAuthor.username } : null,
          repliedTo,
          likedBy: [],
          retweetedBy: [],
          retweets: [],
          replies: [],
          createdAt: new Date(r.createdAt),
        };
      })
    );
    
    return {
      ...tweet,
      author: author ? { ...author, id: author.username } : null,
      createdAt: new Date(tweet.createdAt),
      likeCount: likes?.length || 0,
      retweetCount: retweets?.length || 0,
      replyCount: replies?.length || 0,
      replies: repliesDetailed,
      likedBy: likedBy.filter(Boolean),
      retweetedBy: retweetedBy.filter(Boolean),
      retweets: [],
      retweetedById: '',
      retweetOf: null,
      repliedTo: tweet.isReply ? { id: tweet.repliedToId, author: author ? { ...author, id: author.username } : null } as any : null
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
          { id: like.tweetId },
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
            { id: tweet.repliedToId },
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
      { id: tweetId },
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
    if (!users || users.length === 0) return [];
    const userId = users[0].username;

    // Get conversations where user is a member
    const { data: memberships } = await client.models.ConversationMember.list({
      filter: { userId: { eq: userId } }
    });

    const results: any[] = [];

    for (const m of memberships || []) {
      const { data: conv } = await client.models.Conversation.get({ id: m.conversationId });
      if (!conv) continue;

      // Fetch members
      const { data: memberLinks } = await client.models.ConversationMember.list({
        filter: { conversationId: { eq: conv.id } }
      });
      const members = await Promise.all((memberLinks || []).map(async (ml: any) => {
        const { data: u } = await client.models.User.get({ username: ml.userId }, { selectionSet: userSelectionSet });
        return u ? { ...u, id: u.username } : null;
      }));

      // Fetch messages for conversation
      const { data: msgs } = await client.models.Message.list({
        filter: { conversationId: { eq: conv.id } },
        selectionSet: [
          'id', 'text', 'photoUrl', 'createdAt', 'senderId', 'conversationId',
          'sender.username', 'sender.name', 'sender.photoUrl', 'sender.isPremium'
        ],
        sortDirection: 'ASC'
      });

      const mappedMsgs = (msgs || []).map((msg: any) => ({
        ...msg,
        sender: msg.sender ? { ...msg.sender, id: msg.sender.username } : { id: msg.senderId } as any,
        createdAt: new Date(msg.createdAt)
      }));

      results.push({ id: conv.id, name: conv.name, members: members.filter(Boolean), messages: mappedMsgs });
    }

    return results;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Notification-related fetch functions
export async function getNotifications(userId: string) {
  try {
    const { data: notificationsData } = await client.models.Notification.list({
      filter: { userId: { eq: userId } },
      selectionSet: [
        'id',
        'type',
        'content',
        'isRead',
        'createdAt',
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

    if (!notificationsData) {
        return [];
    }

    const notifications = notificationsData.map(n => ({
        ...n,
        user: n.user ? {
            ...n.user,
            id: n.user.username
        } : null
    }));

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}
