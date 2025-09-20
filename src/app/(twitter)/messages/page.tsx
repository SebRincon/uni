"use client";

import { useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BsEnvelopePlus } from "react-icons/bs";

import NothingToShow from "@/components/misc/NothingToShow";
import NewMessageDialog from "@/components/dialog/NewMessageDialog";
import NewGroupDialog from "@/components/dialog/NewGroupDialog";
import { AuthContext } from "../layout";
import CircularLoading from "@/components/misc/CircularLoading";
import { getUserMessages } from "@/utilities/fetch";
import ConversationWithCall from "@/components/message/ConversationWithCall";
import { Conversation as ConversationType, MessageProps } from "@/types/MessageProps";
import Messages from "@/components/message/Messages";

export default function MessagesPage() {
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
    const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
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
                    <h1 className="page-name">
                        Messages
                        <button
                            onClick={() => setIsNewMessageOpen(true)}
                            className="btn btn-white icon-hoverable new-message"
                        >
                            <BsEnvelopePlus />
                        </button>
                        <button
                            onClick={() => setIsNewGroupOpen(true)}
                            className="btn btn-white icon-hoverable new-message"
                        >
                            + Group
                        </button>
                    </h1>
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
            <NewMessageDialog handleNewMessageClose={handleNewMessageClose} open={isNewMessageOpen} token={token} />
            <NewGroupDialog handleNewMessageClose={handleNewGroupClose} open={isNewGroupOpen} token={token} />
        </main>
    );
}
