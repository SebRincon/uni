import React, { useState } from "react";
import Link from "next/link";
import { Avatar, Menu, MenuItem, Popover, Tooltip } from "@mui/material";
import { AiFillTwitterCircle } from "react-icons/ai";
import { RxDotsHorizontal } from "react-icons/rx";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getFullURL } from "@/utilities/misc/getFullURL";
import { formatDate, formatDateExtended } from "@/utilities/date";
import ProfileCard from "../user/ProfileCard";
import { ConversationProps } from "@/types/MessageProps";
import CircularLoading from "../misc/CircularLoading";
import { deleteConversation } from "@/utilities/fetch";

export default function Conversation({ conversation, token, handleConversations }: ConversationProps) {
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [anchorMenuEl, setAnchorMenuEl] = useState<HTMLElement | null>(null);

    const queryClient = useQueryClient();

    // Handle empty conversation
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
        return null;
    }

    const mutation = useMutation({
        mutationFn: () => {
            // Delete all messages in the conversation
            return Promise.all(
                conversation.messages.map((message: any) => deleteConversation(message.id))
            );
        },
        onSuccess: () => {
            setIsConfirmationOpen(false);
            setIsDeleting(false);
            queryClient.invalidateQueries(["messages", token.username]);
        },
        onError: (error) => console.log(error),
    });

    const messagedUsername = conversation.user.username;
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    // Add defensive checks for recipient/sender data
    let name = "";
    let username = messagedUsername || "";
    let photoUrl = "";
    let isPremium = false;

    if (lastMessage) {
        const recipient = lastMessage.recipient;
        const sender = lastMessage.sender;
        
        // Determine which user info to use based on who is the other participant
        if (recipient && recipient.username === messagedUsername) {
            name = recipient.name || "";
            username = recipient.username || messagedUsername || "";
            photoUrl = recipient.photoUrl || "";
            isPremium = recipient.isPremium || false;
        } else if (sender && sender.username === messagedUsername) {
            name = sender.name || "";
            username = sender.username || messagedUsername || "";
            photoUrl = sender.photoUrl || "";
            isPremium = sender.isPremium || false;
        } else {
            // Fallback to conversation.user if available
            if (conversation) {
                name = conversation.user.name || "";
                username = conversation.user.username || messagedUsername || "";
                photoUrl = conversation.user.photoUrl || "";
                isPremium = conversation.user.isPremium || false;
            }
        }
    }

    const handlePopoverOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };
    const handleConversationClick = () => {
        handleConversations(true, conversation.messages, messagedUsername);
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

    return (
        <div className="conversation" onClick={handleConversationClick}>
            <Link href={`/${username}`} onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose}>
                <Avatar
                    className="avatar"
                    sx={{ width: 50, height: 50 }}
                    alt=""
                    src={photoUrl ? getFullURL(photoUrl) : "/assets/egg.jpg"}
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
                <ProfileCard username={username} token={token} />
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
    );
}
