"use client";

import { useQuery } from "@tanstack/react-query";

import Tweets from "@/components/tweet/Tweets";
import { getUserTweets } from "@/utilities/amplify-data"; // Import new function
import CircularLoading from "@/components/misc/CircularLoading";
import NotFound from "@/app/not-found";
import NothingToShow from "@/components/misc/NothingToShow";

export default function UserTweets({ params: { username } }: { params: { username: string } }) {
    const { isLoading, data } = useQuery({
        queryKey: ["tweets", username],
        queryFn: () => getUserTweets(username), // Use the new function
    });

    if (isLoading) return <CircularLoading />;
    
    if (!data || !data.tweets) return NotFound();

    if (data.tweets.length === 0) return <NothingToShow />;

    return <Tweets tweets={data.tweets as any} />;
}