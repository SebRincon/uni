"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useContext, useMemo } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { getAllTweets } from "@/utilities/fetch";
import NewTweet from "@/components/tweet/NewTweet";
import Tweets from "@/components/tweet/Tweets";
import { AuthContext } from "../layout";
import CircularLoading from "@/components/misc/CircularLoading";

export default function ExplorePage() {
    const { token, isPending } = useContext(AuthContext);

    const { data, fetchNextPage, isLoading, hasNextPage } = useInfiniteQuery(
        ["tweets"],
        async ({ pageParam = 1 }) => getAllTweets(pageParam),
        {
            getNextPageParam: (lastResponse) => {
                if (lastResponse.nextPage > lastResponse.lastPage) return false;
                return lastResponse.nextPage;
            },
        }
    );

    const tweetsResponse = useMemo(
        () =>
            data?.pages.reduce((prev, page) => {
                return {
                    nextPage: page.nextPage,
                    tweets: [...prev.tweets, ...page.tweets],
                };
            }),
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
                    dataLength={tweetsResponse ? tweetsResponse.tweets.length : 0}
                    next={() => fetchNextPage()}
                    hasMore={!!hasNextPage}
                    loader={<CircularLoading />}
                >
                    <Tweets tweets={tweetsResponse && tweetsResponse.tweets} />
                </InfiniteScroll>
            )}
        </main>
    );
}
