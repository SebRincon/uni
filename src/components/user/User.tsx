import { useContext } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@mui/material";
import Link from "next/link";
import { AiFillTwitterCircle } from "react-icons/ai";

import { UserProps } from "@/types/UserProps";
import { AuthContext } from "@/app/(twitter)/layout";
import Friend from "./Friend";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export default function User({ user, showFriendButton = true }: { user: UserProps; showFriendButton?: boolean }) {
    const { token } = useContext(AuthContext);
    const avatarUrl = useStorageUrl(user.photoUrl);

    const router = useRouter();

    const handleProfileClick = () => {
        router.push(`/${user.username}`);
    };

    return (
        <div className="user-wrapper-internal">
            <Link href={`/${user.username}`}>
                <Avatar
                    className="avatar"
                    sx={{ width: 50, height: 50 }}
                    alt=""
                    src={avatarUrl}
                />
            </Link>
            <div onClick={handleProfileClick} className="user">
                <div className="user-profile">
                    <div className="flex">
                        <div className="flex-left">
                            <span className="user-name">
                                {user.name !== "" ? user.name : user.username}
                                {user.isPremium && (
                                    <span className="blue-tick" data-blue="Verified Blue">
                                        <AiFillTwitterCircle />
                                    </span>
                                )}
                            </span>
                            <span className="text-muted">@{user.username}</span>
                        </div>
                        {token && user.username !== token.username && showFriendButton && <Friend profile={user} />}
                    </div>
                    <span className="user-desc">{user.description}</span>
                </div>
            </div>
        </div>
    );
}
