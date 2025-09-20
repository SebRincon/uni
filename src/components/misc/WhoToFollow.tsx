import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineClose } from "react-icons/ai";
import { UserProps } from "@/types/UserProps";

import { getRandomThreeUsers } from "@/utilities/fetch";
import User from "../user/User";

export default function WhoToFollow() {
    const [isEnabled, setIsEnabled] = useState(true);
    const [isOpen, setIsOpen] = useState(true);

    const { data, isFetched } = useQuery({
        queryKey: ["random"],
        queryFn: () => getRandomThreeUsers(3),
        enabled: isEnabled,
    });

    const handleClose = () => {
        setIsOpen(false);
        setIsEnabled(false);
    };

    useEffect(() => {
        if (isFetched) {
            setIsEnabled(false);
        }
    }, [data, isFetched]);

    return (
        <>
            {isOpen && data && data.length > 0 && (
                <div className="who-to-follow">
                    <h1>
                        Suggested friends
                        <button className="btn-close icon-hoverable right-sidebar-close" onClick={handleClose}>
                            <AiOutlineClose />
                        </button>
                    </h1>
                    <div className="user-wrapper">
                        <User user={data[0] as UserProps} />
                    </div>
                    {data.length > 1 && (
                        <div className="user-wrapper">
                            <User user={data[1] as UserProps} />
                        </div>
                    )}
                    {data.length > 2 && (
                        <div className="user-wrapper">
                            <User user={data[2] as UserProps} />
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
