"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { getAllTweets } from "@/utilities/fetch";
import NewTweet from "@/components/tweet/NewTweet";
import Tweets from "@/components/tweet/Tweets";
import { AuthContext } from "../layout";
import CircularLoading from "@/components/misc/CircularLoading";
import { dedupeAndSortByCreatedAtDesc } from "@/utilities/tweet/sort";

export default function ExplorePage() {
    const { token, isPending } = useContext(AuthContext);

    const { data, fetchNextPage, isLoading, hasNextPage } = useInfiniteQuery(
        ["tweets"],
        async ({ pageParam = 1 }) => getAllTweets(),
        {
            getNextPageParam: () => undefined, // No pagination support yet
        }
    );

    const allTweets = useMemo(
        () => {
            const tweets = data?.pages.flat() || [];
            // Map then dedupe and sort by createdAt descending (newest first)
            return dedupeAndSortByCreatedAtDesc(
                tweets
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
            );
        },
        [data]
    );

    if (isPending) return <CircularLoading />;

    return (
        <main>
            <h1 className="page-name">Explore</h1>
            {token && <NewTweet token={token} />}
            {isLoading ? (
                <CircularLoading />
            ) : (
                <InfiniteScroll
                    dataLength={allTweets.length}
                    next={() => fetchNextPage()}
                    hasMore={false} // No pagination support yet
                    loader={<CircularLoading />}
                >
                    <Tweets tweets={allTweets} />
                </InfiniteScroll>
            )}
        </main>
    );
}
