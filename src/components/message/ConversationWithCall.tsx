import React, { useState } from "react";
import Link from "next/link";
import { Avatar, Menu, MenuItem, Popover, Tooltip, IconButton } from "@mui/material";
import { AiFillTwitterCircle } from "react-icons/ai";
import { RxDotsHorizontal } from "react-icons/rx";
import { BiPhone, BiVideo } from "react-icons/bi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useStorageUrl } from "@/hooks/useStorageUrl";
import { formatDate, formatDateExtended } from "@/utilities/date";
import ProfileCard from "../user/ProfileCard";
import { ConversationProps } from "@/types/MessageProps";
import CircularLoading from "../misc/CircularLoading";
import { deleteConversation } from "@/utilities/fetch";
import { useCall } from "@/providers/CallProvider";

export default function ConversationWithCall({ conversation, token, handleConversations }: ConversationProps) {
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [anchorMenuEl, setAnchorMenuEl] = useState<HTMLElement | null>(null);
    const queryClient = useQueryClient();
    const { startCall } = useCall();

    // Determine avatar photo from first other member (for groups, just pick first other member)
    let photoUrl = "";
    const otherMembers = (conversation.members || []).filter((m: any) => m.username !== token.username);
    if (otherMembers.length > 0) {
        photoUrl = otherMembers[0].photoUrl || "";
    }
    
    // Call hook before any returns
    const avatarUrl = useStorageUrl(photoUrl);

    // Define hooks unconditionally before any early returns
    const mutation = useMutation(
        async () => {
            // Delete all messages in the conversation
            const msgs = conversation?.messages ?? [];
            if (msgs.length === 0) return;
            await Promise.all(msgs.map((message: any) => deleteConversation(message.id)));
        },
        {
            onSuccess: () => {
                setIsConfirmationOpen(false);
                setIsDeleting(false);
                queryClient.invalidateQueries({ queryKey: ["messages", token.username] });
            },
            onError: (error) => console.log(error),
        }
    );

    // Handle empty conversation after hooks are declared
    if (!conversation || !conversation.messages) {
        return null;
    }

    const isGroup = (conversation.members || []).length > 2;
    const others = (conversation.members || []).filter((m: any) => m.username !== token.username);
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    let name = "";
    let username = others[0]?.username || "";
    let isPremium = others[0]?.isPremium || false;

    if (isGroup) {
        name = conversation.name || others.map((m: any) => m.username).join(", ");
        username = name;
        isPremium = false;
    } else if (others[0]) {
        name = others[0].name || others[0].username;
        username = others[0].username;
        isPremium = others[0].isPremium || false;
    }
    
    const handlePopoverOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };
    const handleConversationClick = () => {
        handleConversations(true, conversation as any);
    };
    const handleConfirmationClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAnchorMenuEl(null);
        setIsConfirmationOpen(true);
    };
    const handleThreeDotsClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorMenuEl(e.currentTarget);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        handlePopoverClose();
        setIsDeleting(true);
        mutation.mutate();
    };

    const handleVideoCall = async (e: React.MouseEvent) => {
        e.stopPropagation();
        startCall(conversation.id, 'video');
    };

    const handleVoiceCall = async (e: React.MouseEvent) => {
        e.stopPropagation();
        startCall(conversation.id, 'audio');
    };

    return (
        <>
            <div className="conversation" onClick={handleConversationClick}>
                <Link href={`/${username}`} onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose}>
                    <Avatar
                        className="avatar"
                        sx={{ width: 50, height: 50 }}
                        alt=""
                        src={avatarUrl}
                    />
                </Link>
                <div className="user-wrapper">
                    <section className="user-section">
                        <Link
                            className="user-name-link"
                            href={`/${username}`}
                            onMouseEnter={handlePopoverOpen}
                            onMouseLeave={handlePopoverClose}
                        >
                            <span className="user-name">
                                {name !== "" ? name : username}
                                {isPremium && (
                                    <span className="blue-tick" data-blue="Verified Blue">
                                        <AiFillTwitterCircle />
                                    </span>
                                )}
                            </span>
                            <span className="text-muted">@{username}</span>
                        </Link>
                        {lastMessage && (
                            <Tooltip title={formatDateExtended(lastMessage.createdAt)} placement="top">
                                <span className="text-muted date">
                                    <span className="middle-dot">·</span>
                                    {formatDate(lastMessage.createdAt)}
                                </span>
                            </Tooltip>
                        )}
                    </section>
                    <div className="last-message text-muted">{lastMessage?.text || ""}</div>
                </div>
                <div className="call-buttons">
                    <IconButton 
                        onClick={handleVoiceCall}
                        size="small"
                        className="call-button"
                        title="Start voice call"
                    >
                        <BiPhone />
                    </IconButton>
                    <IconButton 
                        onClick={handleVideoCall}
                        size="small"
                        className="call-button"
                        title="Start video call"
                    >
                        <BiVideo />
                    </IconButton>
                </div>
                <>
                    <button className="three-dots icon-hoverable" onClick={handleThreeDotsClick}>
                        <RxDotsHorizontal />
                    </button>
                    <Menu anchorEl={anchorMenuEl} onClose={() => setAnchorMenuEl(null)} open={Boolean(anchorMenuEl)}>
                        <MenuItem onClick={handleConfirmationClick} className="delete">
                            Delete
                        </MenuItem>
                    </Menu>
                </>
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
                    {!isGroup && <ProfileCard username={username} token={token} />}
                </Popover>
                {isConfirmationOpen && (
                    <div className="html-modal-wrapper">
                        <dialog open className="confirm">
                            <h1>Delete Conversation?</h1>
                            <p>
                                Are you sure you want to clear this conversation? If you proceed, your messages will be removed,
                                as well as the messages in the recipient&apos;s message box.
                            </p>
                            {isDeleting ? (
                                <CircularLoading />
                            ) : (
                                <>
                                    <button className="btn btn-danger" onClick={handleDelete}>
                                        Delete
                                    </button>
                                    <button
                                        className="btn btn-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsConfirmationOpen(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </dialog>
                    </div>
                )}
            </div>
        </>
    );
}