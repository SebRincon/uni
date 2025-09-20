import { MessageProps } from "@/types/MessageProps";
import { useState, useEffect } from "react";
import Image from "next/image";

import { formatDate } from "@/utilities/date";
import { getFullURL, getStorageUrl } from "@/utilities/misc/getFullURL";
import PreviewDialog from "../dialog/PreviewDialog";
import { shimmer } from "@/utilities/misc/shimmer";

export default function Message({ message, tokenUsername, isGroupChat }: { message: MessageProps; tokenUsername: string; isGroupChat?: boolean }) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [senderAvatarUrl, setSenderAvatarUrl] = useState<string | null>(null);
    const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

    useEffect(() => {
        const loadAvatarUrl = async () => {
            if (message.sender.photoUrl && message.sender.photoUrl.trim() !== "") {
                setIsLoadingAvatar(true);
                try {
                    const url = await getStorageUrl(message.sender.photoUrl);
                    if (url && url.trim() !== "") {
                        setSenderAvatarUrl(url);
                    }
                } catch (error) {
                    console.error("Error loading avatar:", error);
                }
                setIsLoadingAvatar(false);
            }
        };
        
        loadAvatarUrl();
    }, [message.sender.photoUrl]);

    const handlePreviewClick = () => {
        setIsPreviewOpen(true);
    };
    const handlePreviewClose = () => {
        setIsPreviewOpen(false);
    };

    return (
        <div className={`message ${message.sender.username !== tokenUsername ? "message-left" : "message-right"}`}>
            {isGroupChat && message.sender.username !== tokenUsername && (
                <div className="message-sender-info">
                    <div className="message-sender-avatar">
                        {senderAvatarUrl && !isLoadingAvatar ? (
                            <Image
                                src={senderAvatarUrl}
                                alt={`${message.sender.name || message.sender.username}'s avatar`}
                                width={24}
                                height={24}
                                className="sender-avatar"
                                placeholder="blur"
                                blurDataURL={shimmer(24, 24)}
                            />
                        ) : (
                            <div className="default-avatar">
                                {isLoadingAvatar ? "..." : (message.sender.name || message.sender.username).charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="message-sender-name">{message.sender.name || message.sender.username}</div>
                </div>
            )}
            <div className="message-content">
                <div className="message-text">{message.text}</div>
                {message.photoUrl && (
                    <>
                        <div className="message-image">
                            <Image
                                onClick={handlePreviewClick}
                                src={getFullURL(message.photoUrl)}
                                alt="message image"
                                placeholder="blur"
                                blurDataURL={shimmer(250, 250)}
                                height={250}
                                width={250}
                            />
                        </div>
                        <PreviewDialog open={isPreviewOpen} handlePreviewClose={handlePreviewClose} url={message.photoUrl} />
                    </>
                )}
            </div>
            <div className="message-date">{formatDate(message.createdAt)}</div>
        </div>
    );
}
