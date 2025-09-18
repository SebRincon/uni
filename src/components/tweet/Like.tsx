import { useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { motion } from "framer-motion";

import { TweetOptionsProps } from "@/types/TweetProps";
import { getUserTweet, updateTweetLikes } from "@/utilities/fetch";
import { AuthContext } from "@/app/(twitter)/layout";
import { SnackbarProps } from "@/types/SnackbarProps";
import CustomSnackbar from "../misc/CustomSnackbar";
import { UserProps } from "@/types/UserProps";

export default function Like({ tweetId, tweetAuthor }: TweetOptionsProps) {
    const [isLiked, setIsLiked] = useState(false);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { token, isPending } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const queryKey = ["tweets", tweetAuthor, tweetId];

    const { isFetched, data } = useQuery({
        queryKey: queryKey,
        queryFn: () => getUserTweet(tweetAuthor, tweetId),
    });
    
    // Fetch user likes separately to check if current user liked this tweet
    const { data: userLikes } = useQuery({
        queryKey: ["userLikes", token?.username, tweetId],
        queryFn: async () => {
            if (!token?.username) return [];
            const { getUserLikes } = await import("@/utilities/fetch");
            const likes = await getUserLikes(token.username);
            return likes;
        },
        enabled: !!token?.username,
    });

    const likeMutation = useMutation({
        mutationFn: (tokenOwnerId: string) => updateTweetLikes(tokenOwnerId, tweetId, 'like'),
        onMutate: async (tokenOwnerId: string) => {
            setIsButtonDisabled(true);
            await queryClient.cancelQueries({ queryKey: queryKey });
            const previousData = queryClient.getQueryData<any>(queryKey);
            setIsLiked(true);
            if (previousData) {
                queryClient.setQueryData(queryKey, {
                    ...previousData,
                    likeCount: (previousData.likeCount || 0) + 1,
                });
            }
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            setIsLiked(false);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey });
        },
    });

    const unlikeMutation = useMutation({
        mutationFn: (tokenOwnerId: string) => updateTweetLikes(tokenOwnerId, tweetId, 'unlike'),
        onMutate: async (tokenOwnerId: string) => {
            setIsButtonDisabled(true);
            await queryClient.cancelQueries({ queryKey: queryKey });
            const previousData = queryClient.getQueryData<any>(queryKey);
            setIsLiked(false);
            if (previousData) {
                queryClient.setQueryData(queryKey, {
                    ...previousData,
                    likeCount: Math.max((previousData.likeCount || 0) - 1, 0),
                });
            }
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            setIsLiked(true);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKey });
        },
    });

    const handleLike = () => {
        if (!token) {
            return setSnackbar({
                message: "You need to login to like a tweet.",
                severity: "info",
                open: true,
            });
        }

        const userId = token.id;
        const isLikedByTokenOwner = isLiked; // Use the state value

        if (!likeMutation.isLoading && !unlikeMutation.isLoading) {
            if (isLikedByTokenOwner) {
                unlikeMutation.mutate(userId);
            } else {
                likeMutation.mutate(userId);
            }
        }
    };

    useEffect(() => {
        if (!isPending && userLikes) {
            const isLikedByTokenOwner = userLikes.some((like: any) => like.id === tweetId);
            setIsLiked(isLikedByTokenOwner);
        }
    }, [isPending, userLikes, tweetId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsButtonDisabled(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [isButtonDisabled]);

    return (
        <>
            <motion.button
                className={`icon like ${isLiked ? "active" : ""}`}
                onClick={handleLike}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: isLiked ? [1, 1.5, 1.2, 1] : 1 }}
                transition={{ duration: 0.25 }}
                disabled={isButtonDisabled}
            >
                {isLiked ? (
                    <motion.span animate={{ scale: [1, 1.5, 1.2, 1] }} transition={{ duration: 0.25 }}>
                        <FaHeart />
                    </motion.span>
                ) : (
                    <motion.span animate={{ scale: [1, 0.8, 1] }} transition={{ duration: 0.25 }}>
                        <FaRegHeart />
                    </motion.span>
                )}
                <motion.span animate={{ scale: isLiked ? [0, 1.2, 1] : 0 }} transition={{ duration: 0.25 }} />
                {data?.likeCount === 0 ? null : <span className="count">{data?.likeCount || 0}</span>}
            </motion.button>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
