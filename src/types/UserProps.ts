export type UserProps = {
    id: string;
    name: string | null;
    username: string;
    description: string | null;
    location: string | null;
    website: string | null;
    isPremium: boolean;
    createdAt: Date;
    updatedAt: Date;
    photoUrl: string | null;
    headerUrl: string | null;
    friends: UserProps[];
    pendingIncoming: UserProps[];
    pendingOutgoing: UserProps[];
};

export type UserResponse = {
    success: boolean;
    user: UserProps;
};
