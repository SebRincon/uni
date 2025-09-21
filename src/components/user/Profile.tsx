"use client";

import Image from "next/image";
import Link from "next/link";
import { useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { FaArrowLeft, FaRegEnvelope } from "react-icons/fa";
import { Avatar, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { BiCalendarCheck } from "react-icons/bi";
import { FaUniversity, FaBook } from "react-icons/fa";
import { GoLocation } from "react-icons/go";
import { AiFillTwitterCircle, AiOutlineLink } from "react-icons/ai";

import { formatDateForProfile } from "@/utilities/date";
import { AuthContext } from "@/app/(twitter)/auth-context";
import { UserProps } from "@/types/UserProps";
import TweetArrayLength from "../tweet/TweetArrayLength";
import Friend from "./Friend";
import User from "./User";
import { useStorageUrl, useHeaderUrl } from "@/hooks/useStorageUrl";
import PreviewDialog from "../dialog/PreviewDialog";
import { SnackbarProps } from "@/types/SnackbarProps";
import CustomSnackbar from "../misc/CustomSnackbar";
import NewMessageDialog from "../dialog/NewMessageDialog";

export default function Profile({ profile }: { profile: UserProps }) {
    const [dialogType, setDialogType] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
    const [preview, setPreview] = useState({ open: false, url: "" });
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const { token } = useContext(AuthContext);
    const pathname = usePathname();
    const avatarUrl = useStorageUrl(profile.photoUrl);
    const headerUrl = useHeaderUrl(profile.headerUrl);

    const handleDialogOpen = (type: string) => {
        if (!token) {
            return setSnackbar({
                message: "You need to login first to see friends.",
                severity: "info",
                open: true,
            });
        }

        if (type === "friends" && (profile.friends?.length || 0) === 0) return;
        if (type === "pending" && (((profile.pendingIncoming?.length || 0) + (profile.pendingOutgoing?.length || 0)) === 0)) return;

        setDialogType(type);
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogType("");
        setIsDialogOpen(false);
    };

    const handleImageClick = (e: any) => {
        const clickedElement = e.target;
        if (clickedElement.alt === "profile-header") {
            handlePreviewClick(headerUrl);
        }
        if (clickedElement.alt === "profile-photo") {
            handlePreviewClick(avatarUrl);
        }
    };

    const handlePreviewClick = (url: string) => {
        setPreview({ open: true, url });
    };
    const handlePreviewClose = () => {
        setPreview({ open: false, url: "" });
    };

    const handleNewMessageClick = () => {
        if (!token) {
            return setSnackbar({
                message: "You need to login first to message someone.",
                severity: "info",
                open: true,
            });
        }
        setIsNewMessageOpen(true);
    };

    const isFriendWithTokenOwner = () => {
        if (!token) return false;
        const isFriend = profile.friends?.some((user) => user.id === token.id);
        return !!isFriend;
    };

    return (
        <>
            <div className="back-to">
                <Link className="icon-hoverable" href="/explore">
                    <FaArrowLeft />
                </Link>
                <div className="top">
                    <span className="top-title">{profile.username}</span>
                    <TweetArrayLength username={profile.username} />
                </div>
            </div>
            <div className="profile">
                <div className="profile-header">
                    <Image
                        onClick={handleImageClick}
                        className="div-link"
                        alt="profile-header"
                        src={headerUrl}
                        width={600}
                        height={200}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="avatar-wrapper">
                        <Avatar
                            className="div-link avatar"
                            onClick={handleImageClick}
                            sx={{ width: 125, height: 125 }}
                            alt="profile-photo"
                            src={avatarUrl}
                        />
                    </div>
                </div>
                <div className="profile-info">
                    <div className="profile-info-main">
                        <h1>
                            {profile.name !== "" ? profile.name : profile.username}
                            {profile.isPremium && (
                                <span className="blue-tick" data-blue="Verified Blue">
                                    <AiFillTwitterCircle />
                                </span>
                            )}
                        </h1>
                        <div className="text-muted">
                            @{profile.username}{" "}
{isFriendWithTokenOwner() && <span className="is-following">Friend</span>}
                        </div>
                    </div>
                    {profile.description && <div className="profile-info-desc">{profile.description}</div>}
                    <div className="profile-info-optional text-muted">
{profile.location && (
                            <div>
                                <GoLocation /> {profile.location}
                            </div>
                        )}
                        {profile.university && (
                            <div>
                                <FaUniversity /> {profile.university}
                            </div>
                        )}
                        {profile.majors && profile.majors.length > 0 && (
                            <div>
                                <FaBook /> {profile.majors.join(', ')}
                            </div>
                        )}
                        {profile.website && (
                            <div>
                                <AiOutlineLink />{" "}
                                <a className="mention" href={"https://" + profile.website} target="_blank">
                                    {profile.website}
                                </a>
                            </div>
                        )}
                        <div>
                            <BiCalendarCheck /> Joined {formatDateForProfile(profile.createdAt)}
                        </div>
                    </div>
                    <div className="profile-info-popularity">
                        <div onClick={() => handleDialogOpen("friends")} className="popularity-section">
                            <span className="count">{profile.friends?.length || 0}</span>{" "}
                            <span className="text-muted">Friends</span>
                        </div>
                        <div onClick={() => handleDialogOpen("pending")} className="popularity-section">
                            <span className="count">{(profile.pendingIncoming?.length || 0) + (profile.pendingOutgoing?.length || 0)}</span>{" "}
                            <span className="text-muted">Pending</span>
                        </div>
                    </div>
{token?.username === profile.username ? (
                        <Link href={`/${profile.username}/edit`} className="btn btn-white edit-profile-section">
                            Edit profile
                        </Link>
                    ) : (
                        <div className="edit-profile-section flex">
                            <button className="btn btn-white icon-hoverable new-message" onClick={handleNewMessageClick}>
                                <FaRegEnvelope />
                            </button>
                            <Friend profile={profile} />
                        </div>
                    )}
                </div>
            </div>
            <nav className="profile-nav">
                <Link
                    className={`profile-nav-link ${pathname === `/${profile.username}` ? "active" : ""}`}
                    href={`/${profile.username}`}
                >
                    <span>Tweets</span>
                </Link>
                <Link
                    className={`profile-nav-link ${pathname === `/${profile.username}/replies` ? "active" : ""}`}
                    href={`/${profile.username}/replies`}
                >
                    <span>Replies</span>
                </Link>
                <Link
                    className={`profile-nav-link ${pathname === `/${profile.username}/media` ? "active" : ""}`}
                    href={`/${profile.username}/media`}
                >
                    <span>Media</span>
                </Link>
                <Link
                    className={`profile-nav-link ${pathname === `/${profile.username}/likes` ? "active" : ""}`}
                    href={`/${profile.username}/likes`}
                >
                    <span>Likes</span>
                </Link>
            </nav>
            {isDialogOpen && (
                <Dialog className="dialog" open={isDialogOpen} onClose={handleDialogClose} fullWidth maxWidth="xs">
                    <DialogTitle className="title">
                        {dialogType === "friends" ? "Friends" : dialogType === "pending" ? "Pending" : ""}
                    </DialogTitle>
                    <DialogContent sx={{ paddingX: 0 }}>
                        <div className="user-list">
                            {dialogType === "friends"
                                ? (profile.friends || []).map((user: UserProps) => (
                                      <div className="user-wrapper" key={"friend" + user.id}>
                                          <User user={user} />
                                      </div>
                                  ))
                                : ([...(profile.pendingIncoming || []), ...(profile.pendingOutgoing || [])]).map((user: UserProps) => (
                                      <div className="user-wrapper" key={"pending" + user.id}>
                                          <User user={user} />
                                      </div>
                                  ))}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            <PreviewDialog open={preview.open} handlePreviewClose={handlePreviewClose} url={preview.url} />
            {token && isNewMessageOpen && (
                <NewMessageDialog
                    handleNewMessageClose={() => setIsNewMessageOpen(false)}
                    open={isNewMessageOpen}
                    token={token}
                    recipient={profile.username}
                />
            )}
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
        </>
    );
}
