"use client";

import { useState } from "react";
import Link from "next/link";
import { FaHeart, FaRegComment, FaRegEnvelope } from "react-icons/fa";
import { GiPartyPopper } from "react-icons/gi";
import { RiChatFollowUpLine } from "react-icons/ri";
import { Avatar, Popover } from "@mui/material";

import { NotificationProps } from "@/types/NotificationProps";
import RetweetIcon from "./RetweetIcon";
import ProfileCard from "../user/ProfileCard";
import { UserProps } from "@/types/UserProps";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export default function Notification({ notification, token }: { notification: NotificationProps; token: UserProps }) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handlePopoverOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    // Gracefully handle content being JSON or plain text
    let content: any = null;
    const raw = notification.content;
    if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
        if (looksJson) {
            try {
                content = JSON.parse(trimmed);
            } catch (error) {
                // Only warn if it looked like JSON but failed to parse
                console.warn('Notification content looked like JSON but failed to parse:', error);
                content = null;
            }
        } else {
            // Plain text (e.g., welcome or legacy seed) — no parse needed
            content = null;
        }
    } else if (raw && typeof raw === 'object') {
        content = raw;
    }

    const tweetId = content?.content?.id;
    const senderUsername = content?.sender?.username;
    const tweetUrl = tweetId ? `/${notification.user.username}/tweets/${tweetId}` : '#';
    const profileUrl = senderUsername ? `/${senderUsername}` : '#';

    const popoverJSX = (
        <Popover
            sx={{
                pointerEvents: "none",
            }}
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            anchorOrigin={{
                vertical: "top",
                horizontal: "center",
            }}
            transformOrigin={{
                vertical: "bottom",
                horizontal: "center",
            }}
            onClose={handlePopoverClose}
            disableRestoreFocus
        >
            {Boolean(anchorEl) && senderUsername ? (
                <ProfileCard username={senderUsername} token={token} />
            ) : null}
        </Popover>
    );

    const senderAvatarUrl = useStorageUrl(content?.sender?.photoUrl);

    const sharedJSX = senderUsername ? (
        <div className="notification-sender">
            <Link
                href={profileUrl}
                className="avatar-wrapper"
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
            >
                <Avatar
                    sx={{ width: 33, height: 33 }}
                    alt=""
                    src={senderAvatarUrl}
                    imgProps={{ onError: (e: any) => { (e.currentTarget as HTMLImageElement).src = '/assets/egg.jpg'; } }}
                />
                <div className="profile-info-main">
                    <h1>
                        {(content?.sender?.name ?? '') !== "" ? (content?.sender?.name ?? '') : senderUsername}{" "}
                        <span className="text-muted">(@{senderUsername})</span>
                    </h1>
                </div>
            </Link>
            {popoverJSX}
        </div>
    ) : null;

    if (notification.type === "message") {
        return (
            <div className="notification">
                <div className="icon-div message">
                    <FaRegEnvelope />
                </div>
                <div>
                    {sharedJSX} <span className={!notification.isRead ? "bold" : ""}>Sent you a direct message.</span>{" "}
                    <Link className={`notification-link ${!notification.isRead ? "bold" : ""}`} href="/messages">
                        Check it out!
                    </Link>
                </div>
            </div>
        );
    } else if (notification.type === "follow") {
        return (
            <div className="notification">
                <div className="icon-div follow">
                    <RiChatFollowUpLine />
                </div>
                <div>
                    {sharedJSX}{" "}
                    <span className={!notification.isRead ? "bold" : ""}>
                        Started following you. Stay connected and discover their updates!
                    </span>
                </div>
            </div>
        );
    } else if (notification.type === "like") {
        return (
            <div className="notification">
                <div className="icon-div like">
                    <FaHeart />
                </div>
                <div>
                    {sharedJSX} <span className={!notification.isRead ? "bold" : ""}>Liked your</span>{" "}
                    {tweetId ? (
                        <Link className={`notification-link ${!notification.isRead ? "bold" : ""}`} href={tweetUrl}>
                            tweet.
                        </Link>
                    ) : (
                        <span className={`notification-link ${!notification.isRead ? "bold" : ""}`}>tweet.</span>
                    )}
                </div>
            </div>
        );
    } else if (notification.type === "reply") {
        return (
            <div className="notification ">
                <div className="icon-div reply">
                    <FaRegComment />
                </div>
                <div>
                    {sharedJSX} <span className={!notification.isRead ? "bold" : ""}>Replied to your</span>{" "}
                    {tweetId ? (
                        <Link className={`notification-link ${!notification.isRead ? "bold" : ""}`} href={tweetUrl}>
                            tweet.
                        </Link>
                    ) : (
                        <span className={`notification-link ${!notification.isRead ? "bold" : ""}`}>tweet.</span>
                    )}
                </div>
            </div>
        );
    } else if (notification.type === "retweet") {
        return (
            <div className="notification">
                <div className="icon-div retweet">
                    <RetweetIcon />
                </div>
                <div>
                    {sharedJSX} <span className={!notification.isRead ? "bold" : ""}>Retweeted your</span>{" "}
                    {tweetId ? (
                        <Link className={`notification-link ${!notification.isRead ? "bold" : ""}`} href={tweetUrl}>
                            tweet.
                        </Link>
                    ) : (
                        <span className={`notification-link ${!notification.isRead ? "bold" : ""}`}>tweet.</span>
                    )}
                </div>
            </div>
        );
    } else if (notification.type === "friend_request") {
        return (
            <div className="notification">
                <div className="icon-div follow">
                    <RiChatFollowUpLine />
                </div>
                <div>
                    {sharedJSX}{" "}
                    <span className={!notification.isRead ? "bold" : ""}>
                        Sent you a friend request.
                    </span>{" "}
                    <Link className={`notification-link ${!notification.isRead ? "bold" : ""}`} href="/friends/requests">
                        Review
                    </Link>
                </div>
            </div>
        );
    } else if (notification.type === "friend_accept") {
        return (
            <div className="notification">
                <div className="icon-div follow">
                    <RiChatFollowUpLine />
                </div>
                <div>
                    {sharedJSX}{" "}
                    <span className={!notification.isRead ? "bold" : ""}>
                        Accepted your friend request.
                    </span>{" "}
                    {senderUsername ? (
                        <Link className={`notification-link ${!notification.isRead ? "bold" : ""}`} href={profileUrl}>
                            View profile
                        </Link>
                    ) : null}
                </div>
            </div>
        );
    } else {
        return (
            <div className="notification">
                <div className="icon-div welcome">
                    <GiPartyPopper />
                </div>
                <div className={!notification.isRead ? "bold" : ""}>
                    Welcome to Uni! <br />
                    Start exploring and sharing your thoughts with the world.
                </div>
            </div>
        );
    }
}
