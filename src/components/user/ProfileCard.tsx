import { Avatar } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { AiFillTwitterCircle } from "react-icons/ai";

import { getUser } from "@/utilities/fetch";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import CircularLoading from "../misc/CircularLoading";
import { UserProps } from "@/types/UserProps";
import { VerifiedToken } from "@/types/TokenProps";

export default function ProfileCard({ username, token }: { username: string; token: VerifiedToken }) {
    const { isLoading, data, isError } = useQuery({
        queryKey: ["users", username],
        queryFn: () => getUser(username),
        retry: false,
    });
    
    const avatarUrl = useStorageUrl(data?.photoUrl);

    if (isLoading) return <CircularLoading />;

    // Graceful fallback if user is missing or fetch errored
    if (isError || !data) {
        return (
            <div className="profile-card">
                <div className="avatar-wrapper">
                    <Avatar sx={{ width: 75, height: 75 }} alt="" src={avatarUrl} />
                </div>
                <div className="profile-info-main">
                    <h1>{username}</h1>
                    <div className="text-muted">@{username}</div>
                </div>
                <div className="profile-info-desc text-muted">User not found</div>
            </div>
        );
    }

    const isFollowingTokenOwner = () => {
        if (!data || data.following.length === 0 || !token) return false;
        const isFollowing = data.following.some((user) => user && user.id === token.id);
        return isFollowing;
    };

    return (
        <div className="profile-card">
            <div className="avatar-wrapper">
                <Avatar
                    sx={{ width: 75, height: 75 }}
                    alt=""
                    src={avatarUrl}
                />
            </div>
            <div className="profile-info-main">
                <h1>
                    {data.name !== "" ? data.name : data.username}
                    {data.isPremium && (
                        <span className="blue-tick" data-blue="Verified Blue">
                            <AiFillTwitterCircle />
                        </span>
                    )}
                </h1>
                <div className="text-muted">
                    @{data.username} {isFollowingTokenOwner() && <span className="is-following">Follows you</span>}
                </div>
            </div>
            {data.description && <div className="profile-info-desc">{data.description}</div>}
            <div className="profile-info-popularity">
                <div className="popularity-section">
                    <span className="count">{data.following.length}</span> <span className="text-muted">Following</span>
                </div>
                <div className="popularity-section">
                    <span className="count">{data.followers.length}</span> <span className="text-muted">Followers</span>
                </div>
            </div>
        </div>
    );
}
