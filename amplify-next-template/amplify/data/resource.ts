import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  User: a
    .model({
      username: a.string().unique(),
      name: a.string(),
      description: a.string(),
      location: a.string(),
      website: a.string(),
      photoUrl: a.string(),
      headerUrl: a.string(),
      isPremium: a.boolean().default(false),
      // Relationships
      createdTweets: a.hasMany("Tweet", "authorId"),
      following: a.manyToMany(() => "User", {
        relationName: "UserFollows",
      }),
      followers: a.manyToMany(() => "User", {
        relationName: "UserFollows",
      }),
      sentMessages: a.hasMany("Message", "senderId"),
      receivedMessages: a.hasMany("Message", "recipientId"),
      notifications: a.hasMany("Notification", "userId"),
    })
    .authorization(allow => [allow.owner(), allow.publicApiKey().to(['read'])]),

  Tweet: a
    .model({
      text: a.string().required(),
      photoUrl: a.string(),
      isRetweet: a.boolean().default(false),
      isReply: a.boolean().default(false),
      // Relationships
      authorId: a.id(),
      author: a.belongsTo("User", "authorId"),
      likedBy: a.manyToMany(() => "User", { relationName: "UserLikes" }),
      retweetedBy: a.manyToMany(() => "User", { relationName: "UserRetweets" }),
      replies: a.hasMany("Tweet", "repliedToId"),
      repliedToId: a.id(),
      repliedTo: a.belongsTo("Tweet", "repliedToId"),
    })
    .authorization(allow => [allow.owner(), allow.publicApiKey().to(['read'])]),
  
  Message: a
    .model({
        text: a.string().required(),
        photoUrl: a.string(),
        // Relationships
        senderId: a.id(),
        sender: a.belongsTo("User", "senderId"),
        recipientId: a.id(),
        recipient: a.belongsTo("User", "recipientId"),
    })
    .authorization(allow => [allow.owner()]),

  Notification: a
    .model({
        type: a.string().required(),
        content: a.string().required(),
        isRead: a.boolean().default(false),
        // Relationships
        userId: a.id(),
        user: a.belongsTo("User", "userId"),
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // Add userPool for authenticated users
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});