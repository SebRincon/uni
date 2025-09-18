// @ts-nocheck
import { client } from '@/lib/amplify-client';

export const shouldCreateNotification = async (sender: string, recipient: string) => {
    try {
        // Get the last notification for this sender/recipient pair
        const { data: notifications } = await client.models.Notification.list({
            filter: {
                and: [
                    { type: { eq: 'message' } },
                    { userId: { eq: recipient } },
                    { content: { contains: sender } }
                ]
            },
            sortDirection: 'DESC',
            limit: 1
        });

        if (!notifications || notifications.length === 0) return true;

        const lastNotification = notifications[0];
        const currentTime = Date.now();
        const lastNotificationTime = new Date(lastNotification.createdAt).getTime();
        const oneHour = 60 * 60 * 1000;

        if (currentTime - lastNotificationTime >= oneHour) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking notification status:', error);
        return true; // Default to creating notification on error
    }
};

// this function determines if enough time is passed to create notification while messaging