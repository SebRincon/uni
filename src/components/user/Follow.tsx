import { useContext, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AuthContext } from "@/app/(twitter)/layout";
import { updateUserFollows } from "@/utilities/fetch";
import { UserProps, UserResponse } from "@/types/UserProps";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";

export default function Follow({ profile }: { profile: UserProps }) {
    const [isFollowed, setIsFollowed] = useState(false);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { token, isPending, refreshToken } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const queryKey = ["users", profile.username];

    const followMutation = useMutation({
        mutationFn: (tokenOwnerId: string) => updateUserFollows(tokenOwnerId, profile.id, 'follow'),
        onMutate: async (tokenOwnerId: string) => {
            setIsButtonDisabled(true);
            await queryClient.cancelQueries({ queryKey: queryKey });
            const previous = queryClient.getQueryData<UserProps>(queryKey);
            setIsFollowed(false);
            if (previous) {
                queryClient.setQueryData<UserProps>(queryKey, {
                    ...previous,
                    followers: previous.followers.filter(
                        (user: UserProps) => user.id !== tokenOwnerId
                    ),
                });
            }
            return { previous };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", profile.username] });
            if (refreshToken) refreshToken();
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: (tokenOwnerId: string) => updateUserFollows(tokenOwnerId, profile.id, 'unfollow'),
        onMutate: async (tokenOwnerId: string) => {
            setIsButtonDisabled(true);
            await queryClient.cancelQueries({ queryKey: queryKey });
            const previous = queryClient.getQueryData<UserProps>(queryKey);
            setIsFollowed(false);
            if (previous) {
                queryClient.setQueryData<UserProps>(queryKey, {
                    ...previous,
                    followers: previous.followers.filter(
                        (user: UserProps) => user.id !== tokenOwnerId
                    ),
                });
            }
            return { previous };
        },
        onError: (err, variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", profile.username] });
            if (refreshToken) refreshToken();
        },
    });

    const handleFollowclick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!token) {
            return setSnackbar({
                message: "You need to login first to follow someone.",
                severity: "info",
                open: true,
            });
        }

        const tokenOwnerId = token.id;

        if (!followMutation.isLoading && !unfollowMutation.isLoading) {
            if (isFollowed) {
                unfollowMutation.mutate(tokenOwnerId);
            } else {
                followMutation.mutate(tokenOwnerId);
            }
        }
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    useEffect(() => {
        if (!isPending && token) {
            const isFollowed = token.following?.some(user => user.id === profile.id);
            setIsFollowed(!!isFollowed);
        } else if (!isPending) {
            setIsFollowed(false);
        }
    }, [isPending, token, profile.id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsButtonDisabled(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [isButtonDisabled]);

    const conditionalText = isFollowed ? (isHovered ? "Unfollow" : "Following") : "Follow";
    const conditionalClass = isFollowed ? (isHovered ? "btn btn-danger-outline" : "btn btn-white") : "btn btn-dark";

    return (
        <>
            <button
                onClick={handleFollowclick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={conditionalClass}
                disabled={isButtonDisabled}
            >
                {conditionalText}
            </button>
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
