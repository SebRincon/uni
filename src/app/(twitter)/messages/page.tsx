"use client";

import { useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BsEnvelopePlus } from "react-icons/bs";
import { FaPlus, FaUserFriends } from "react-icons/fa";

import NothingToShow from "@/components/misc/NothingToShow";
import NewMessageDialog from "@/components/dialog/NewMessageDialog";
import NewGroupDialog from "@/components/dialog/NewGroupDialog";
import { AuthContext } from "../auth-context";
import CircularLoading from "@/components/misc/CircularLoading";
import { getUserMessages } from "@/utilities/fetch";
import ConversationWithCall from "@/components/message/ConversationWithCall";
import { Conversation as ConversationType, MessageProps } from "@/types/MessageProps";
import Messages from "@/components/message/Messages";

export default function MessagesPage() {
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
    const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isConversationSelected, setIsConversationSelected] = useState<{ selected: boolean; conversation: ConversationType | null }>({
        selected: false,
        conversation: null,
    });

    const { token, isPending } = useContext(AuthContext);

    const { isLoading, data, isFetched } = useQuery({
        queryKey: ["messages", token && token.username],
        queryFn: () => token && getUserMessages(token.username),
        enabled: !!token,
    });

    const handleNewMessageClose = () => {
        setIsNewMessageOpen(false);
    };

    const handleNewGroupClose = () => {
        setIsNewGroupOpen(false);
    };

    const handleOptionsModalClose = () => {
        setIsOptionsModalOpen(false);
    };

    const handleNewMessageClick = () => {
        setIsOptionsModalOpen(false);
        setIsNewMessageOpen(true);
    };

    const handleNewGroupClick = () => {
        setIsOptionsModalOpen(false);
        setIsNewGroupOpen(true);
    };

    const handleConversations = (isSelected: boolean, conversation?: ConversationType) => {
        setIsConversationSelected({ selected: isSelected, conversation: conversation || null });
    };

    if (isPending || !token || isLoading) return <CircularLoading />;

    const conversations = data || [];

    return (
        <main className="messages-page">
            {isConversationSelected.selected && isConversationSelected.conversation ? (
                <Messages
                    conversation={isConversationSelected.conversation}
                    handleConversations={handleConversations}
                    token={token}
                />
            ) : (
                <>
                    <div className="messages-header">
                        <h1 className="page-name">Messages</h1>
                        <button
                            onClick={() => setIsOptionsModalOpen(true)}
                            className="btn btn-white icon-hoverable add-button"
                        >
                            <FaPlus />
                        </button>
                    </div>
                    {isFetched && !(conversations.length > 0) && <NothingToShow />}
                    <div>
                        {conversations.map((conversation: any) => {
                            return (
                                <ConversationWithCall
                                    key={conversation.id}
                                    conversation={conversation}
                                    token={token}
                                    handleConversations={handleConversations}
                                />
                            );
                        })}
                    </div>
                </>
            )}
            
            {/* Options Modal */}
            {isOptionsModalOpen && (
                <div className="options-modal-overlay" onClick={handleOptionsModalClose}>
                    <div className="options-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="options-grid">
                            <button className="option-card" onClick={handleNewMessageClick}>
                                <div className="option-icon">
                                    <BsEnvelopePlus />
                                </div>
                                <div className="option-text">
                                    <h3>New Message</h3>
                                    <p>Send a direct message to a friend</p>
                                </div>
                            </button>
                            <button className="option-card" onClick={handleNewGroupClick}>
                                <div className="option-icon">
                                    <FaUserFriends />
                                </div>
                                <div className="option-text">
                                    <h3>New Group</h3>
                                    <p>Create a group conversation</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <NewMessageDialog handleNewMessageClose={handleNewMessageClose} open={isNewMessageOpen} token={token} />
            <NewGroupDialog handleNewMessageClose={handleNewGroupClose} open={isNewGroupOpen} token={token} />
        </main>
    );
}
