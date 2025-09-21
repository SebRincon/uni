"use client";

import { useContext } from "react";
import Link from "next/link";

import { AuthContext } from "@/app/(twitter)/auth-context";
import Search from "../misc/Search";
import WhoToFollow from "../misc/WhoToFollow";
import CompleteProfileReminder from "../misc/CompleteProfileReminder";
import Legal from "../misc/Legal";

export default function RightSidebar() {
    const { token, isPending } = useContext(AuthContext);

    return (
        <aside className="right-sidebar">
            <div className="fixed">
                <Search />
                <div className="trending-section">
                    <h2>Trending</h2>
                    {/* Add trending topics here */}
                </div>
                {token && <WhoToFollow />}
                {token && <CompleteProfileReminder token={token} />}
                {!isPending && !token && (
                    <div className="new-to-twitter">
                        <h2>New to Twitter?</h2>
                        <p>Sign up now to get your own personalized timeline!</p>
                        <div className="reminder-buttons">
                            <Link href="/" className="btn btn-dark">
                                Sign Up
                            </Link>
                            <Link href="/" className="btn btn-white">
                                Log In
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
