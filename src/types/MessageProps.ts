import { UserProps } from "./UserProps";

export type MessageProps = {
    id: string;
    sender: UserProps;
    text: string;
    createdAt: Date;
    photoUrl: string;
    conversationId: string;
};

export type Conversation = {
    id: string;
    name?: string | null;
    members: UserProps[];
    messages: MessageProps[];
};

export type ConversationProps = {
    conversation: Conversation;
    token: UserProps;
    handleConversations: (isSelected: boolean, conversation?: Conversation) => void;
};

export type MessagesProps = {
    conversation: Conversation;
    handleConversations: (isSelected: boolean, conversation?: Conversation) => void;
    token: UserProps;
};

export type MessageFormProps = {
    token: UserProps;
    conversationId: string;
    setFreshMessages: any;
    freshMessages: MessageProps[];
};
