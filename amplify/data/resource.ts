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
      // New profile fields
      university: a.string(),
      majors: a.string().array(),
      // Relationships
      createdTweets: a.hasMany("Tweet", "authorId"),
      notifications: a.hasMany("Notification", "userId"),
      likes: a.hasMany("UserLikes", "userId"),
      retweets: a.hasMany("UserRetweets", "userId"),
      // Conversations and messages
      messages: a.hasMany("Message", "senderId"),
      conversationMemberships: a.hasMany("ConversationMember", "userId"),
      friendshipsA: a.hasMany("Friendship", "userAId"),
      friendshipsB: a.hasMany("Friendship", "userBId"),
      // Video call relationships
      initiatedCalls: a.hasMany("VideoCall", "initiatorId"),
      callParticipations: a.hasMany("CallParticipant", "userId"),
      callNotifications: a.hasMany("CallNotification", "userId"),
    }).identifier(["username"]),

    Tweet: a.model({
      text: a.string().required(),
      photoUrl: a.string(),
      isRetweet: a.boolean().default(false),
      isReply: a.boolean().default(false),
      isSensitive: a.boolean().default(false),
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
  
    // Conversations for 1:1 and group chats
    Conversation: a.model({
      name: a.string(),
      createdBy: a.id(),
      // Relationships
      messages: a.hasMany("Message", "conversationId"),
      members: a.hasMany("ConversationMember", "conversationId"),
      videoCalls: a.hasMany("VideoCall", "conversationId"),
    }),

    ConversationMember: a.model({
      conversationId: a.id().required(),
      conversation: a.belongsTo("Conversation", "conversationId"),
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
    }).secondaryIndexes((index) => [
      index("conversationId"),
      index("userId"),
    ]),

    Message: a.model({
      text: a.string().required(),
      photoUrl: a.string(),
      // Relationships
      senderId: a.id().required(),
      sender: a.belongsTo("User", "senderId"),
      conversationId: a.id().required(),
      conversation: a.belongsTo("Conversation", "conversationId"),
    }),

    Notification: a.model({
      type: a.string().required(),
      content: a.string().required(),
      isRead: a.boolean().default(false),
      // Relationships
      userId: a.id(),
      user: a.belongsTo("User", "userId"),
    }),

    // Friendships with request/accept lifecycle
    Friendship: a.model({
      userAId: a.id().required(), // lexicographically smaller username
      userA: a.belongsTo("User", "userAId"),
      userBId: a.id().required(), // lexicographically larger username
      userB: a.belongsTo("User", "userBId"),
      requesterId: a.id().required(), // who initiated request
      status: a.string().required().default("pending"), // pending | accepted | declined
    }).secondaryIndexes((index) => [
      index("userAId"),
      index("userBId"),
      index("status"),
      index("requesterId"),
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

    // Video Call Models
    VideoCall: a.model({
      conversationId: a.id().required(),
      conversation: a.belongsTo("Conversation", "conversationId"),
      initiatorId: a.id().required(),
      initiator: a.belongsTo("User", "initiatorId"),
      status: a.string().required().default("initiating"), // initiating | ringing | active | ended | failed
      type: a.string().required().default("video"), // video | audio
      meetingId: a.string(), // LiveKit Room Name
      startTime: a.datetime(),
      endTime: a.datetime(),
      // Relationships
      participants: a.hasMany("CallParticipant", "callId"),
      notifications: a.hasMany("CallNotification", "callId"),
    }).secondaryIndexes((index) => [
      index("conversationId"),
      index("initiatorId"),
      index("status"),
    ]),

    CallParticipant: a.model({
      callId: a.id().required(),
      call: a.belongsTo("VideoCall", "callId"),
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
      status: a.string().required().default("invited"), // invited | ringing | connected | disconnected | declined
      joinTime: a.datetime(),
      leaveTime: a.datetime(),
      attendeeId: a.string(), // LiveKit Participant ID
    }).secondaryIndexes((index) => [
      index("callId"),
      index("userId"),
      index("status"),
    ]),

    // Call notifications for real-time updates
    CallNotification: a.model({
      userId: a.id().required(),
      user: a.belongsTo("User", "userId"),
      callId: a.id().required(),
      call: a.belongsTo("VideoCall", "callId"),
      type: a.string().required(), // incoming_call | missed_call | call_ended
      isRead: a.boolean().default(false),
    }).secondaryIndexes((index) => [
      index("userId"),
      index("callId"),
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
