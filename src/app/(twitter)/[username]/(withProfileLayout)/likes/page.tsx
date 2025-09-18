"use client";

import { useQuery } from "@tanstack/react-query";

import Tweets from "@/components/tweet/Tweets";
import { getUserLikes } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NotFound from "@/app/not-found";
import NothingToShow from "@/components/misc/NothingToShow";

export default function LikesPage({ params: { username } }: { params: { username: string } }) {
    const { isLoading, data } = useQuery({
        queryKey: ["tweets", username, "likes"],
        queryFn: () => getUserLikes(username),
        initialData: [],
    });

    if (isLoading) return <CircularLoading />;

    if (!data || data.length === 0) return NothingToShow();

    // Filter out any null values and ensure proper typing
    const validTweets = data.filter((tweet): tweet is NonNullable<typeof tweet> => tweet !== null);

    return <Tweets tweets={validTweets as any} />;
}
