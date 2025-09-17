import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a
  .schema({
    User: a.model({
      username: a.string().required(),
      name: a.string(),
      description: a.string(),
      location: a.string(),
      website: a.string(),
      photoUrl: a.string(),
      headerUrl: a.string(),
      isPremium: a.boolean().default(false),
      // Relationships
      createdTweets: a.hasMany("Tweet", "authorId"),
      following: a.hasMany("UserFollows", "followerId"),
      followers: a.hasMany("UserFollows", "followingId"),
      sentMessages: a.hasMany("Message", "senderId"),
      receivedMessages: a.hasMany("Message", "recipientId"),
      notifications: a.hasMany("Notification", "userId"),
      likes: a.hasMany("UserLikes", "userId"),
      retweets: a.hasMany("UserRetweets", "userId"),
    }).identifier(["username"]),

    Tweet: a.model({
      text: a.string().required(),
      photoUrl: a.string(),
      isRetweet: a.boolean().default(false),
      isReply: a.boolean().default(false),
      // Relationships
      authorId: a.id().required(),
      author: a.belongsTo("User", "authorId"),
      likes: a.hasMany("UserLikes", "tweetId"),
      retweets: a.hasMany("UserRetweets", "tweetId"),
      replies: a.hasMany("Tweet", "repliedToId"),
      repliedToId: a.id(),
      repliedTo: a.belongsTo("Tweet", "repliedToId"),
      retweetOfId: a.id(),
      retweetOf: a.belongsTo("Tweet", "retweetOfId"),
      // For tracking original tweets that were retweeted
      retweetedVersions: a.hasMany("Tweet", "retweetOfId"),
    }),
  
    Message: a.model({
      text: a.string().required(),
      photoUrl: a.string(),
      // Relationships
      senderId: a.id(),
      sender: a.belongsTo("User", "senderId"),
      recipientId: a.id(),
      recipient: a.belongsTo("User", "recipientId"),
    }),

    Notification: a.model({
      type: a.string().required(),
      content: a.string().required(),
      isRead: a.boolean().default(false),
      // Relationships
      userId: a.id(),
      user: a.belongsTo("User", "userId"),
    }),

    // Join table for User following User (many-to-many)
    UserFollows: a.model({
      followerId: a.id().required(),
      follower: a.belongsTo("User", "followerId"),
      followingId: a.id().required(),
      following: a.belongsTo("User", "followingId"),
    }).secondaryIndexes((index) => [
      index("followerId"),
      index("followingId"),
    ]),

    // Join table for User likes Tweet (many-to-many)
    UserLikes: a.model({
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
      tweetId: a.id().required(),
      tweet: a.belongsTo("Tweet", "tweetId"),
    }).secondaryIndexes((index) => [
      index("userId"),
      index("tweetId"),
    ]),

    // Join table for User retweets Tweet (many-to-many)
    UserRetweets: a.model({
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
      tweetId: a.id().required(),
      tweet: a.belongsTo("Tweet", "tweetId"),
    }).secondaryIndexes((index) => [
      index("userId"),
      index("tweetId"),
    ]),
  })
  .authorization((allow) => [
    allow.publicApiKey().to(["read"]),
    allow.authenticated(),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});