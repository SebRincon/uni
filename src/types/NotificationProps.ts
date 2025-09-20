import { UserProps } from "./UserProps";

export type NotificationProps = {
    recipient: string;
    type: NotificationTypes;
    secret: string;
    id: string;
    user: UserProps;
    content: string;
    notificationContent: NotificationContent;
    isRead: boolean;
};

export type NotificationTypes = "welcome" | "follow" | "like" | "reply" | "retweet" | "message" | "friend_request" | "friend_accept";

export type NotificationContent = null | {
    content: null | {
        id: string;
    };
    sender: {
        name: string;
        username: string;
        photoUrl: string;
    };
};
