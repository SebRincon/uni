import { useEffect, useState } from "react";
import { Dialog } from "@mui/material";

import { NewTweetDialogProps } from "@/types/DialogProps";
import NewTweet from "../tweet/NewTweet";

export default function NewTweetDialog({ open, handleNewTweetClose, token }: NewTweetDialogProps) {
    const [isSubmitted, setIsSubmited] = useState(false);

    const handleSubmit = () => {
        setIsSubmited(!isSubmitted);
    };

    useEffect(() => {
        handleNewTweetClose();
    }, [isSubmitted]);

    return (
        <Dialog
            className="dialog"
            open={open}
            onClose={handleNewTweetClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                style: {
                    backgroundColor: '#15202b',
                    border: '1px solid #38444d'
                }
            }}
        >
            <div className="new-tweet-wrapper">
                <NewTweet token={token} handleSubmit={handleSubmit} />
            </div>
        </Dialog>
    );
}
