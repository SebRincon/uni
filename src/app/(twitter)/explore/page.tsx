"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useContext, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

import { getAllTweets, getTweetsByUniversity, getTweetsByMajor } from "@/utilities/fetch";
import NewTweet from "@/components/tweet/NewTweet";
import Tweets from "@/components/tweet/Tweets";
import FeedTabs from "@/components/layout/FeedTabs";
import { AuthContext } from "../auth-context";
import CircularLoading from "@/components/misc/CircularLoading";
import { dedupeAndSortByCreatedAtDesc } from "@/utilities/tweet/sort";

export default function ExplorePage() {
    const { token, isPending } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState("for_you");

    // Dynamically define tabs based on user profile
    const tabs = useMemo(() => {
        const tabList = [{ label: "For You", value: "for_you" }];
        
        // Check for university - not just truthy but also not empty string
        if (token?.university && token.university.trim() !== '') {
            tabList.push({ label: token.university, value: "university" });
        }
        
        // Check for majors array with actual content
        if (token?.majors && token.majors.length > 0 && token.majors[0].trim() !== '') {
            // Using the first major for the tab
            tabList.push({ label: token.majors[0], value: "major" });
        }
        
        console.log('User token:', token); // Debug log
        console.log('Generated tabs:', tabList); // Debug log
        
        return tabList;
    }, [token]);

    // Function to fetch tweets based on active tab
    const fetchTweetsByTab = () => {
        switch (activeTab) {
            case "university":
                return getTweetsByUniversity(token!.university!);
            case "major":
                return getTweetsByMajor(token!.majors![0]);
            case "for_you":
            default:
                return getAllTweets();
        }
    };

    const { data, fetchNextPage, isLoading, hasNextPage } = useInfiniteQuery(
        ["tweets", activeTab],
        async ({ pageParam = 1 }) => fetchTweetsByTab(),
        {
            getNextPageParam: () => undefined, // No pagination support yet
            enabled: !isPending,
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
            <FeedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === "for_you" && token && <NewTweet token={token} />}
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
