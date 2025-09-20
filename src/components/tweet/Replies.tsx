import { useQuery } from "@tanstack/react-query";

import { TweetOptionsProps, TweetProps } from "@/types/TweetProps";
import { getUserTweet } from "@/utilities/fetch";
import CircularLoading from "../misc/CircularLoading";
import Tweet from "./Tweet";

export default function Replies({ tweetId, tweetAuthor }: TweetOptionsProps) {
    const queryKey = ["tweets", tweetAuthor, tweetId, "replies"];

    const { isLoading, data } = useQuery({
        queryKey: queryKey,
        queryFn: () => getUserTweet(tweetAuthor, tweetId),
    });

    if (isLoading) return <CircularLoading />;

    const replies = (data?.replies || []).map((reply: any) => ({
        ...reply,
        likedBy: reply.likedBy || [],
        retweetedBy: reply.retweetedBy || [],
        retweets: reply.retweets || [],
        replies: reply.replies || [],
        createdAt: new Date(reply.createdAt),
    }));

    return (
        <div>
            {replies.map((reply: any) => (
                <Tweet key={reply.id} tweet={reply} />
            ))}
        </div>
    );
}
