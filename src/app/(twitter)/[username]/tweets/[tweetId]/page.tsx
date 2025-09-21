"use client";

import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { getUserTweet } from "@/utilities/fetch";
import SingleTweet from "@/components/tweet/SingleTweet";
import CircularLoading from "@/components/misc/CircularLoading";
import { AuthContext } from "@/app/(twitter)/auth-context";
import NotFound from "@/app/not-found";
import BackButton from "@/components/misc/BackButton";

export default function SingleTweetPage({
    params: { username, tweetId },
}: {
    params: { username: string; tweetId: string };
}) {
    const queryKey = ["tweets", username, tweetId];

    const { token, isPending } = useContext(AuthContext);
    const { isLoading, data, isFetched } = useQuery({
        queryKey: queryKey,
        queryFn: () => getUserTweet(username, tweetId),
    });

    if (!isLoading && !data) return NotFound();

    const backTitle = isFetched && data && (data as any).isReply ? "Post" : username;

    return (
        <div>
            {isFetched && <BackButton title={backTitle} />}
            {isLoading || isPending ? <CircularLoading /> : data && <SingleTweet tweet={data as any} token={token} />}
        </div>
    );
}
