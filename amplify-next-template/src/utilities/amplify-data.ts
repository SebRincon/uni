import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

export const client = generateClient<Schema>();

export const getUserTweets = async (username: string) => {
    const { data: users, errors: userErrors } = await client.models.User.list({
        filter: { username: { eq: username } }
    });
    if (userErrors) throw new Error(userErrors[0].message);
    if (!users[0]) return { tweets: [] };
    
    // Once we have a user, we can fetch their tweets
    // Note: This is a simplified approach. For production, consider modeling GSI for direct username query on tweets.
    const user = users[0];
    const { data: tweets, errors: tweetErrors } = await user.createdTweets();
    
    if (tweetErrors) throw new Error(tweetErrors[0].message);

    return { tweets };
};

// ... other refactored data fetching functions would go here
// For example: getUser, getAllTweets, createTweet, etc.