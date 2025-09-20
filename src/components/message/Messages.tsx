import { useEffect, useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

import Message from "./Message";
import NewMessageBox from "./NewMessageBox";
import { MessageProps, MessagesProps } from "@/types/MessageProps";

export default function Messages({ conversation, handleConversations, token }: MessagesProps) {
    const [freshMessages, setFreshMessages] = useState([] as MessageProps[]);
    const isGroupChat = conversation.members.length > 2;

    const messagesWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFreshMessages(conversation.messages as any);
    }, [conversation]);

    useEffect(() => {
        const messagesWrapper = messagesWrapperRef.current;
        messagesWrapper?.scrollTo({
            top: messagesWrapper.scrollHeight,
            behavior: "smooth",
        });
    }, [freshMessages]);

    return (
        <main className="messages-container">
            <div className="back-to">
                <button className="icon-hoverable btn btn-white" onClick={() => handleConversations(false)}>
                    <FaArrowLeft />
                </button>
                <div className="top">
                    <span className="top-title">{conversation.name || conversation.members.filter(m => m.username !== token.username).map(m => m.username).join(", ")}</span>
                </div>
            </div>
            <div className="messages-wrapper" ref={messagesWrapperRef}>
                {freshMessages.length > 0 &&
                    freshMessages.map((message: MessageProps) => (
                        <Message key={message.id} message={message} tokenUsername={token.username} isGroupChat={isGroupChat} />
                    ))
                }
            </div>
            <NewMessageBox
                conversationId={conversation.id}
                token={token}
                setFreshMessages={setFreshMessages}
                freshMessages={freshMessages}
            />
        </main>
    );
}
