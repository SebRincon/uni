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

    const isFriendWithTokenOwner = () => {
        if (!data || !token) return false;
        const isFriend = (data.friends || []).some((user: any) => user && user.id === token.id);
        return !!isFriend;
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
@{data.username} {isFriendWithTokenOwner() && <span className="is-following">Friend</span>}
                </div>
            </div>
            {data.description && <div className="profile-info-desc">{data.description}</div>}
            <div className="profile-info-popularity">
                <div className="popularity-section">
<span className="count">{(data.friends || []).length}</span> <span className="text-muted">Friends</span>
                </div>
                <div className="popularity-section">
<span className="count">{((data.pendingIncoming || []).length + (data.pendingOutgoing || []).length)}</span> <span className="text-muted">Pending</span>
                </div>
            </div>
        </div>
    );
}
