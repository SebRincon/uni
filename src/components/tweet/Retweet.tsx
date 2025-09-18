import { useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { TweetOptionsProps } from "@/types/TweetProps";
import { AuthContext } from "@/app/(twitter)/layout";
import { getUserTweet, updateRetweets } from "@/utilities/fetch";
import RetweetIcon from "../misc/RetweetIcon";
import { SnackbarProps } from "@/types/SnackbarProps";
import CustomSnackbar from "../misc/CustomSnackbar";

export default function Retweet({ tweetId, tweetAuthor }: TweetOptionsProps) {
    const [isRetweeted, setIsRetweeted] = useState(false);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { token, isPending } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const queryKey = ["tweets", tweetAuthor, tweetId];

    const { isFetched, data } = useQuery({
        queryKey: queryKey,
        queryFn: () => getUserTweet(tweetAuthor, tweetId),
    });

    const mutation = useMutation({
        mutationFn: (variables: { userId: string; isRetweeted: boolean }) => 
            updateRetweets(variables.userId, tweetId, variables.isRetweeted ? 'unretweet' : 'retweet'),
        onMutate: () => {
            setIsButtonDisabled(true);
            setIsRetweeted(!isRetweeted);
        },
        onSuccess: () => {
            setIsButtonDisabled(false);
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
        },
        onError: (error) => console.log(error),
    });

    const handleRetweet = () => {
        if (!token) {
            return setSnackbar({
                message: "You need to login to retweet.",
                severity: "info",
                open: true,
            });
        }

        if (mutation.isLoading) return;

        const userId = token.id;
        
        mutation.mutate({
            userId,
            isRetweeted,
        });
    };

    // Check if user has retweeted by fetching user's retweets
    const { data: userRetweets } = useQuery({
        queryKey: ["userRetweets", token?.username],
        queryFn: async () => {
            if (!token?.username) return [];
            const { getUserLikes } = await import("@/utilities/fetch");
            // Note: This is a workaround - ideally we'd have a getUserRetweets function
            return [];
        },
        enabled: !!token?.username,
    });
    
    useEffect(() => {
        // For now, we can't check if user has retweeted
        // This would require a getUserRetweets function or checking UserRetweets table
        setIsRetweeted(false);
    }, [isPending, isFetched]);

    return (
        <>
            <motion.button
                className={`icon retweet ${isRetweeted ? "active" : ""}`}
                onClick={handleRetweet}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: isRetweeted ? [1, 1.5, 1.2, 1] : 1 }}
                transition={{ duration: 0.25 }}
                disabled={isButtonDisabled}
            >
                <motion.span animate={{ scale: [1, 1.5, 1.2, 1] }} transition={{ duration: 0.25 }}>
                    <RetweetIcon />
                </motion.span>
                <motion.span animate={{ scale: isRetweeted ? [0, 1.2, 1] : 0 }} transition={{ duration: 0.25 }} />
                {data?.retweetCount === 0 ? null : (
                    <span className="count">{data?.retweetCount || 0}</span>
                )}
            </motion.button>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
