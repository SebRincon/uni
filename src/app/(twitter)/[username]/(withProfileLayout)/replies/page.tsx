"use client";

import { useQuery } from "@tanstack/react-query";

import Tweets from "@/components/tweet/Tweets";
import { getUserReplies } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NotFound from "@/app/not-found";
import NothingToShow from "@/components/misc/NothingToShow";

export default function RepliesPage({ params: { username } }: { params: { username: string } }) {
    const { isLoading, data } = useQuery({
        queryKey: ["tweets", username, "replies"],
        queryFn: () => getUserReplies(username),
    });

    if (!isLoading && !data) return NotFound();

    if (data && data.length === 0) return NothingToShow();

    // Map the data to the expected format
    const mappedTweets = data?.map((tweet: any) => ({
        ...tweet,
        likedBy: [],
        retweets: [],
        replies: [],
        retweetedBy: [],
        retweetedById: '',
        retweetOf: null,
        createdAt: new Date(tweet.createdAt)
    })) || [];
    
    return <>{isLoading ? <CircularLoading /> : data && <Tweets tweets={mappedTweets} />}</>;
}
