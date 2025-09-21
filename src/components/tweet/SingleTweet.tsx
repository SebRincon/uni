import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { RxDotsHorizontal } from "react-icons/rx";
import { Avatar, Menu, MenuItem } from "@mui/material";
import { AiFillTwitterCircle } from "react-icons/ai";

import { TweetProps } from "@/types/TweetProps";
import { formatDateExtended } from "@/utilities/date";
import Reply from "./Reply";
import Retweet from "./Retweet";
import Like from "./Like";
import Share from "./Share";
import Counters from "./Counters";
import { getFullURL } from "@/utilities/misc/getFullURL";
import { VerifiedToken } from "@/types/TokenProps";
import { deleteTweet } from "@/utilities/fetch";
import PreviewDialog from "../dialog/PreviewDialog";
import { shimmer } from "@/utilities/misc/shimmer";
import AttachmentPdfChip from "@/components/tweet/AttachmentPdfChip";
import AttachmentImage from "@/components/tweet/AttachmentImage";
import NewReply from "./NewReply";
import Replies from "./Replies";
import CustomSnackbar from "../misc/CustomSnackbar";
import { SnackbarProps } from "@/types/SnackbarProps";
import CircularLoading from "../misc/CircularLoading";
import { sleepFunction } from "@/utilities/misc/sleep";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import SensitiveGate from "../misc/SensitiveGate";

export default function SingleTweet({ tweet, token }: { tweet: TweetProps; token: VerifiedToken }) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [snackbar, setSnackbar] = useState<SnackbarProps>({ message: "", severity: "success", open: false });

    const queryClient = useQueryClient();
    const router = useRouter();
    
    // Use the hook for the avatar URL
    const avatarUrl = useStorageUrl(tweet.author.photoUrl);

    const mutation = useMutation({
        mutationFn: () => deleteTweet(tweet.id),
        onSuccess: async () => {
            setIsConfirmationOpen(false);
            setIsDeleting(false);
            setSnackbar({
                message: "Tweet deleted successfully. Redirecting to the profile page...",
                severity: "success",
                open: true,
            });
            await sleepFunction(); // for waiting snackbar to acknowledge delete for better user experience
            queryClient.invalidateQueries(["tweets", tweet.author.username]);
            router.replace(`/${tweet.author.username}`);
        },
        onError: (error) => console.log(error),
    });

    const handleAnchorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
    };
    const handleAnchorClose = () => {
        setAnchorEl(null);
    };
    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handlePreviewClick();
    };
    const handlePreviewClick = () => {
        setIsPreviewOpen(true);
    };
    const handlePreviewClose = () => {
        setIsPreviewOpen(false);
    };
    const handleConfirmationClick = () => {
        handleAnchorClose();
        setIsConfirmationOpen(true);
    };

    const handleDelete = async () => {
        if (!token) {
            return setSnackbar({
                message: "You must be logged in to delete tweets...",
                severity: "info",
                open: true,
            });
        }
        handleAnchorClose();
        setIsDeleting(true);
        mutation.mutate();
    };

    return (
        <div>
            <div className={`single-tweet tweet ${tweet.isReply && "reply"}`}>
                <div className="single-tweet-author-section">
                    <div>
                        <Link className="tweet-avatar" href={`/${tweet.author.username}`}>
                            <Avatar
                                className="avatar"
                                sx={{ width: 50, height: 50 }}
                                alt=""
                                src={avatarUrl}
                            />
                        </Link>
                    </div>
                    <div className="tweet-author-section">
                        <Link className="tweet-author-link" href={`/${tweet.author.username}`}>
                            <span className="tweet-author">
                                {tweet.author.name !== "" ? tweet.author.name : tweet.author.username}
                                {tweet.author.isPremium && (
                                    <span className="blue-tick" data-blue="Verified Blue">
                                        <AiFillTwitterCircle />
                                    </span>
                                )}
                            </span>
                            <span className="text-muted">@{tweet.author.username}</span>
                        </Link>
                        {token && token.username === tweet.author.username && (
                            <>
                                <button className="three-dots icon-hoverable" onClick={handleAnchorClick}>
                                    <RxDotsHorizontal />
                                </button>
                                <Menu anchorEl={anchorEl} onClose={handleAnchorClose} open={Boolean(anchorEl)}>
                                    <MenuItem onClick={handleConfirmationClick} className="delete">
                                        Delete
                                    </MenuItem>
                                </Menu>
                            </>
                        )}
                    </div>
                </div>
                <div className="tweet-main">
                    <div className="tweet-text">
                        {tweet.isReply && (
                            <Link href={`/${tweet.repliedTo.author.username}`} className="reply-to">
                                <span className="mention">@{tweet.repliedTo.author.username}</span>
                            </Link>
                        )}{" "}
                        {tweet.isSensitive ? (
                            <SensitiveGate text={<span>{tweet.text}</span>} />
                        ) : (
                            <>{tweet.text}</>
                        )}
                    </div>
                    {/* Attachments (images + pdfs) */}
                    {Array.isArray((tweet as any).attachments) && (tweet as any).attachments.length > 0 && (
                        <div className="attachments">
                            <div className="attachments-grid">
                                {((tweet as any).attachments as string[]).map((path: string, idx: number) => {
                                    const type = (tweet as any).attachmentTypes?.[idx] || '';
                                    if (type.startsWith('image/')) {
                                        return (
                                            <div key={idx} className="tweet-image">
                                                <AttachmentImage
                                                    path={path}
                                                    alt={`attachment-${idx}`}
                                                    onClick={handleImageClick}
                                                />
                                            </div>
                                        );
                                    } else {
                                        const name = (tweet as any).attachmentNames?.[idx] || 'attachment.pdf';
                                        return (
                                            <AttachmentPdfChip key={idx} path={path} name={name} />
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    )}

                    {/* Legacy single photo */}
                    {tweet.photoUrl && (
                        <>
                            {tweet.isSensitive ? (
                              <SensitiveGate
                                image={(
                                  <div className="tweet-image">
                                    <Image
                                      onClick={handleImageClick}
                                      src={getFullURL(tweet.photoUrl)}
                                      alt="tweet image"
                                      placeholder="blur"
                                      blurDataURL={shimmer(500, 500)}
                                      height={500}
                                      width={500}
                                    />
                                  </div>
                                )}
                              />
                            ) : (
                              <>
                                <div className="tweet-image">
                                    <Image
                                        onClick={handleImageClick}
                                        src={getFullURL(tweet.photoUrl)}
                                        alt="tweet image"
                                        placeholder="blur"
                                        blurDataURL={shimmer(500, 500)}
                                        height={500}
                                        width={500}
                                    />
                                </div>
                                <PreviewDialog
                                    open={isPreviewOpen}
                                    handlePreviewClose={handlePreviewClose}
                                    url={tweet.photoUrl}
                                />
                              </>
                            )}
                        </>
                    )}

                    {(tweet.university || tweet.course || (Array.isArray(tweet.tags) && tweet.tags.length > 0)) && (
                        <div className="tweet-badges">
                            {tweet.university && (
                                <span className="badge university" title="University">{tweet.university}</span>
                            )}
                            {tweet.course && (
                                <span className="badge course" title="Major/Course">{tweet.course}</span>
                            )}
                            {Array.isArray(tweet.tags) && tweet.tags.map((t: string) => (
                                <span className="badge tag" key={t}>#{t}</span>
                            ))}
                        </div>
                    )}

                    <span className="text-muted date">{formatDateExtended(tweet.createdAt)}</span>
                    <Counters tweet={tweet} />
                    <div className="tweet-bottom">
                        <Reply tweet={tweet} />
                        <Retweet tweetId={tweet.id} tweetAuthor={tweet.author.username} />
                        <Like tweetId={tweet.id} tweetAuthor={tweet.author.username} />
                        <Share
                            tweetUrl={`https://${window.location.hostname}/${tweet.author.username}/tweets/${tweet.id}`}
                        />
                    </div>
                </div>
            </div>
            {token && <NewReply token={token} tweet={tweet} />}
            {tweet.replies.length > 0 && <Replies tweetId={tweet.id} tweetAuthor={tweet.author.username} />}
            {snackbar.open && (
                <CustomSnackbar message={snackbar.message} severity={snackbar.severity} setSnackbar={setSnackbar} />
            )}
            {isConfirmationOpen && (
                <div className="html-modal-wrapper">
                    <dialog open className="confirm">
                        <h1>Delete Tweet?</h1>
                        <p>
                            This can’t be undone and it will be removed from your profile, the timeline of any accounts that
                            follow you, and from Twitter search results.
                        </p>
                        {isDeleting ? (
                            <CircularLoading />
                        ) : (
                            <>
                                <button className="btn btn-danger" onClick={handleDelete}>
                                    Delete
                                </button>
                                <button className="btn btn-white" onClick={() => setIsConfirmationOpen(false)}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </dialog>
                </div>
            )}
        </div>
    );
}
