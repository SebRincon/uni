"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Menu, MenuItem, Fab } from "@mui/material";
import { FaHome, FaBell, FaEnvelope, FaUser, FaCog, FaHashtag, FaUserPlus, FaBook, FaPlus, FaEllipsisH } from "react-icons/fa";
import Image from "next/image";

import { AuthContext } from "@/app/(twitter)/auth-context";
import UnreadNotificationsBadge from "../misc/UnreadNotificationsBadge";
import NewTweetDialog from "../dialog/NewTweetDialog";
import LogOutDialog from "../dialog/LogOutDialog";
import { logout } from "@/utilities/fetch";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export default function BottomNavigation() {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isNewTweetOpen, setIsNewTweetOpen] = useState(false);
    const [isLogOutOpen, setIsLogOutOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const { token } = useContext(AuthContext);
    const avatarUrl = useStorageUrl(token?.photoUrl);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            // Since logout() now throws an error, we handle it here
            // The actual logout is handled in LogOutDialog
        }
        router.push("/");
    };

    const handleAnchorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handleAnchorClose = () => {
        setAnchorEl(null);
    };
    const handleNewTweetClick = () => {
        setIsNewTweetOpen(true);
    };
    const handleNewTweetClose = () => {
        setIsNewTweetOpen(false);
    };
    const handleLogOutClick = () => {
        handleAnchorClose();
        setIsLogOutOpen(true);
    };
    const handleLogOutClose = () => {
        setIsLogOutOpen(false);
    };

    const navItems = [
        ...(token ? [{
            href: "/home",
            icon: <FaHome />,
            label: "Home",
            active: pathname.startsWith("/home")
        }] : []),
        {
            href: "/explore",
            icon: <FaHashtag />,
            label: "Explore",
            active: pathname.startsWith("/explore")
        },
        {
            href: "/classes",
            icon: <FaBook />,
            label: "Classes",
            active: pathname.startsWith("/classes")
        },
        ...(token ? [
            {
                href: "/notifications",
                icon: (
                    <div className="badge-wrapper">
                        <FaBell />
                        <UnreadNotificationsBadge />
                    </div>
                ),
                label: "Notifications",
                active: pathname.startsWith("/notifications")
            },
            {
                href: "/messages",
                icon: <FaEnvelope />,
                label: "Messages",
                active: pathname.startsWith("/messages")
            },
            {
                href: "/friends/requests",
                icon: <FaUserPlus />,
                label: "Requests",
                active: pathname.startsWith("/friends/requests")
            },
            {
                href: `/${token.username}`,
                icon: <FaUser />,
                label: "Profile",
                active: pathname.startsWith(`/${token.username}`)
            }
        ] : []),
        {
            href: "/settings",
            icon: <FaCog />,
            label: "Settings",
            active: pathname.startsWith("/settings")
        }
    ];

    return (
        <>
            <nav className="bottom-navigation">
                <div className="bottom-nav-container">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className="bottom-nav-item">
                            <div className={`bottom-nav-link ${item.active ? "active" : ""}`}>
                                <div className="bottom-nav-icon">
                                    {item.icon}
                                </div>
                                <span className="bottom-nav-label">{item.label}</span>
                            </div>
                        </Link>
                    ))}
                    {token && (
                        <button onClick={handleAnchorClick} className="bottom-nav-item bottom-nav-profile">
                            <div className="bottom-nav-link">
                                <div className="bottom-nav-icon">
                                    <Avatar
                                        className="bottom-nav-avatar"
                                        alt=""
                                        src={avatarUrl}
                                    />
                                </div>
                                <span className="bottom-nav-label">Profile</span>
                            </div>
                        </button>
                    )}
                </div>
            </nav>
            
            {/* Floating Action Button for New Tweet */}
            {token && (
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={handleNewTweetClick}
                    className="fab-tweet"
                    sx={{
                        position: 'fixed',
                        bottom: 85,
                        right: 16,
                        backgroundColor: 'var(--twitter-blue)',
                        '&:hover': {
                            backgroundColor: 'var(--twitter-dark-blue)',
                        },
                    }}
                >
                    <FaPlus />
                </Fab>
            )}

            {/* Profile Menu */}
            {token && (
                <Menu
                    anchorEl={anchorEl}
                    onClose={handleAnchorClose}
                    open={Boolean(anchorEl)}
                    anchorOrigin={{
                        vertical: "top",
                        horizontal: "center",
                    }}
                    transformOrigin={{
                        vertical: "bottom",
                        horizontal: "center",
                    }}
                >
                    <MenuItem onClick={handleAnchorClose}>
                        <Link href={`/${token.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>Profile</Link>
                    </MenuItem>
                    <MenuItem onClick={handleAnchorClose}>
                        <Link href={`/${token.username}/edit`} style={{ textDecoration: 'none', color: 'inherit' }}>Edit Profile</Link>
                    </MenuItem>
                    <MenuItem onClick={handleAnchorClose}>
                        <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>Settings</Link>
                    </MenuItem>
                    <MenuItem onClick={handleLogOutClick}>Log Out</MenuItem>
                </Menu>
            )}

            {/* Dialogs */}
            {token && (
                <>
                    <NewTweetDialog open={isNewTweetOpen} handleNewTweetClose={handleNewTweetClose} token={token} />
                    <LogOutDialog
                        open={isLogOutOpen}
                        handleLogOutClose={handleLogOutClose}
                        logout={handleLogout}
                        isLoggingOut={isLoggingOut}
                    />
                </>
            )}
        </>
    );
}