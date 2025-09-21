import { useContext } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@mui/material";
import Link from "next/link";
import Image from "next/image";

import { UserProps } from "@/types/UserProps";
import { AuthContext } from "@/app/(twitter)/auth-context";
import Friend from "../user/Friend";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export default function SuggestedFriend({ user }: { user: UserProps }) {
    const { token } = useContext(AuthContext);
    const avatarUrl = useStorageUrl(user.photoUrl);
    const router = useRouter();

    const handleProfileClick = () => {
        router.push(`/${user.username}`);
    };

    return (
        <div className="suggested-friend-row">
            {/* Left side: Avatar */}
            <div className="suggested-friend-avatar">
                <Link href={`/${user.username}`}>
                    <Avatar
                        className="avatar"
                        sx={{ width: 48, height: 48 }}
                        alt=""
                        src={avatarUrl}
                    />
                </Link>
            </div>
            
            {/* Right side: User info and button */}
            <div className="suggested-friend-content">
                {/* User info section */}
                <div className="suggested-friend-info" onClick={handleProfileClick}>
                    <div className="suggested-friend-name">
                        {user.name !== "" ? user.name : user.username}
                        {user.isPremium && (
                            <span className="blue-tick" data-blue="Verified Blue">
                                <Image
                                    src="/assets/unicorn-head-purple.png"
                                    alt="Verified"
                                    width={16}
                                    height={16}
                                    style={{ display: 'inline' }}
                                />
                            </span>
                        )}
                    </div>
                    <div className="suggested-friend-username text-muted">
                        @{user.username}
                    </div>
                </div>
                
                {/* Button section */}
                <div className="suggested-friend-action">
                    {token && user.username !== token.username && <Friend profile={user} />}
                </div>
            </div>
        </div>
    );
}