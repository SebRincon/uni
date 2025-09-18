import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useContext } from "react";

import { getNotifications } from "@/utilities/fetch";
import { NotificationProps } from "@/types/NotificationProps";
import { AuthContext } from "@/app/(twitter)/layout";

export default function UnreadNotificationsBadge() {
    const { token } = useContext(AuthContext);
    
    const { data } = useQuery({
        queryKey: ["notifications", token?.id],
        queryFn: () => token ? getNotifications(token.id) : [],
        enabled: !!token,
    });

    const lengthOfUnreadNotifications =
        data?.filter((notification: any) => !notification.isRead)?.length ?? 0;

    const animationVariants = {
        initial: { opacity: 0, scale: 0 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0 },
    };

    return (
        <>
            {lengthOfUnreadNotifications > 0 && (
                <motion.span className="badge" variants={animationVariants} initial="initial" animate="animate" exit="exit">
                    {lengthOfUnreadNotifications}
                </motion.span>
            )}
        </>
    );
}
