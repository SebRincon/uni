"use client";

import { useContext } from "react";
import { AuthContext } from "@/app/(twitter)/auth-context";
import WhoToFollow from "../misc/WhoToFollow";

export default function LeftSidePanel() {
    const { token } = useContext(AuthContext);

    return (
        <aside className="left-side-panel">
            <div className="left-panel-content">
                {token && <WhoToFollow />}
            </div>
        </aside>
    );
}