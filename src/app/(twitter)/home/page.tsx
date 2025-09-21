"use client";

import { useContext, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import Tweets from "@/components/tweet/Tweets";
import { getAllTweets, getTweetsByUniversity, getTweetsByMajor } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import NewTweet from "@/components/tweet/NewTweet";
import FeedTabs from "@/components/layout/FeedTabs";
import { AuthContext } from "../auth-context";

export default function HomePage() {
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

    const { isLoading, data } = useQuery({
        queryKey: ["tweets", "home", activeTab],
        queryFn: fetchTweetsByTab,
        enabled: !isPending,
    });

    if (isPending || isLoading) return <CircularLoading />;

    return (
        <main>
            <h1 className="page-name">Home</h1>
            <FeedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === "for_you" && token && <NewTweet token={token} />}
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
