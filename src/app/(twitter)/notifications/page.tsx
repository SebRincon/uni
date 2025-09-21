"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useEffect } from "react";

import { AuthContext } from "../auth-context";
import { getNotifications, markNotificationsRead } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import { NotificationProps } from "@/types/NotificationProps";
import Notification from "@/components/misc/Notification";

export default function NotificationsPage() {
    const { token, isPending } = useContext(AuthContext);

    const queryClient = useQueryClient();

    const { isLoading, data, isFetched } = useQuery({
        queryKey: ["notifications", token?.id],
        queryFn: () => token ? getNotifications(token.id) : [],
        enabled: !!token,
    });

    const mutation = useMutation({
        mutationFn: markNotificationsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(["notifications"]);
        },
        onError: (error) => console.log(error),
    });

    const handleNotificationsRead = () => {
        // Mark all unread notifications as read
        if (data) {
            const unreadNotifications = data.filter((n: any) => !n.isRead);
            unreadNotifications.forEach((notification: any) => {
                mutation.mutate(notification.id);
            });
        }
    };

    useEffect(() => {
        if (isFetched && data && data.filter((notification: any) => !notification.isRead).length > 0) {
            const countdownForMarkAsRead = setTimeout(() => {
                handleNotificationsRead();
            }, 1000);

            return () => {
                clearTimeout(countdownForMarkAsRead);
            };
        }
    }, []);

    if (isPending || !token || isLoading) return <CircularLoading />;

    const notifications = data || [];

    return (
        <main>
            <h1 className="page-name">Notifications</h1>
            {isFetched && notifications.length === 0 ? (
                <NothingToShow />
            ) : (
                <div className="notifications-wrapper">
                    {notifications.map((notification: any) => {
                        // Map notification to expected format
                        const mappedNotification = {
                            ...notification,
                            recipient: token.username,
                            secret: '',
                            user: token,
                            notificationContent: {
                                user: null,
                                tweet: null
                            },
                            createdAt: new Date(notification.createdAt)
                        };
                        return <Notification key={notification.id} notification={mappedNotification} token={token} />;
                    })}
                </div>
            )}
        </main>
    );
}
