"use client";

import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import Tweets from "@/components/tweet/Tweets";
import { getAllTweets } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import NewTweet from "@/components/tweet/NewTweet";
import { AuthContext } from "../auth-context";

export default function HomePage() {
    const { token, isPending } = useContext(AuthContext);

    const { isLoading, data } = useQuery({
        queryKey: ["tweets", "home"],
        queryFn: () => getAllTweets(),
    });

    if (isPending || isLoading) return <CircularLoading />;

    return (
        <main>
            <h1 className="page-name">Home</h1>
            {token && <NewTweet token={token} />}
            {data && data.length === 0 && <NothingToShow />}
            {
                // Map and sort tweets by createdAt descending (newest first)
                (() => {
                    const mappedTweets = (data || [])
                        .map((tweet: any) => ({
                            ...tweet,
                            likedBy: [],
                            retweets: [],
                            replies: [],
                            retweetedBy: [],
                            retweetedById: '',
                            // Preserve retweetOf if backend provided it
                            retweetOf: tweet.retweetOf || null,
                            repliedTo: tweet.repliedTo || null,
                            createdAt: new Date(tweet.createdAt)
                        }))
                        .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
                    return <Tweets tweets={mappedTweets} />;
                })()
            }
        </main>
    );
}
