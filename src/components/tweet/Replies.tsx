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

    const replies = data?.replies || [];

    return (
        <div>
            {replies.map((reply: any) => {
                // Map the reply to the expected format
                const mappedTweet = {
                    ...reply,
                    likedBy: [],
                    retweets: [],
                    replies: [],
                    retweetedBy: [],
                    retweetedById: '',
                    retweetOf: null,
                    repliedTo: null,
                    createdAt: new Date(reply.createdAt)
                };
                return <Tweet key={reply.id} tweet={mappedTweet} />;
            })}
        </div>
    );
}
