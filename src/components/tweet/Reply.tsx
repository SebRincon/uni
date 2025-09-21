import { FaRegComment } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { TweetProps } from "@/types/TweetProps";
import { getUserTweet } from "@/utilities/fetch";

export default function Reply({ tweet }: { tweet: TweetProps }) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/${tweet.author.username}/tweets/${tweet.id}`);
    };

    // Fetch counts like the Like/Retweet buttons so reply count is accurate in lists
    const { data } = useQuery({
        queryKey: ["tweets", tweet.author.username, tweet.id],
        queryFn: () => getUserTweet(tweet.author.username, tweet.id),
    });

    const replyCount = typeof data?.replyCount === 'number' ? data.replyCount : (Array.isArray(tweet.replies) ? tweet.replies.length : 0);

    return (
        <button className="icon reply" onClick={handleClick}>
            <FaRegComment /> {replyCount === 0 ? null : <span className="count">{replyCount}</span>}
        </button>
    );
}
