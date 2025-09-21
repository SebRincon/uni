import { useState } from "react";
import { TextField, Avatar } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FaRegImage, FaRegSmile } from "react-icons/fa";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import Link from "next/link";

import CircularLoading from "../misc/CircularLoading";
import { createReply, createTweet } from "@/utilities/fetch";
import Uploader from "../misc/Uploader";
import { getFullURL } from "@/utilities/misc/getFullURL";
import { uploadFile } from "@/utilities/storage";
import { UserProps } from "@/types/UserProps";
import { TweetProps } from "@/types/TweetProps";
import ProgressCircle from "../misc/ProgressCircle";
import { useKornMentionDetection } from "@/hooks/useKornAI";

export default function NewReply({ token, tweet }: { token: UserProps; tweet: TweetProps }) {
    const [showPicker, setShowPicker] = useState(false);
    const [showDropzone, setShowDropzone] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [count, setCount] = useState(0);

    const queryClient = useQueryClient();
    const { shouldTriggerKornResponse } = useKornMentionDetection();

    const queryKey = ["tweets", tweet.author.username, tweet.id];

    // Function to process Korn AI mentions in replies
    const processKornMention = async (replyData: any, replyText: string) => {
        if (shouldTriggerKornResponse(replyText, token.username)) {
            try {
                console.log('🤖 Processing @Korn mention in reply:', replyData.id);
                
                const response = await fetch('/api/ai/korn-mention', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tweetId: replyData.id,
                        authorId: token.id,
                        authorUsername: token.username,
                        content: replyText,
                        isReply: true,
                        parentTweetId: tweet.id
                    })
                });

                const result = await response.json();
                
                if (result.success && result.response.responseContent) {
                    console.log('🤖 Korn AI replied:', result.response.responseContent);
                    
                    try {
                        // Create Korn's reply to the reply
                        await createTweet(
                            'KornAI',
                            result.response.responseContent,
                            undefined,
                            replyData.id // reply to the user's reply
                        );
                        
                        console.log('✅ Korn AI reply posted successfully');
                        
                        // Refresh the tweet thread to show the AI response
                        queryClient.invalidateQueries({ queryKey: queryKey });
                        queryClient.invalidateQueries({ queryKey: ["tweets"] });
                    } catch (createError) {
                        console.error('❌ Error creating Korn AI reply:', createError);
                        console.error('💡 Make sure the "KornAI" user account exists in your database');
                    }
                } else {
                    console.log('🤖 Korn AI processing failed or no response');
                }
            } catch (error) {
                console.error('🤖 Error processing Korn mention in reply:', error);
            }
        }
    };

    const mutation = useMutation({
        mutationFn: (data: { text: string; photoFile?: File }) => 
            createReply(token.id, { ...data, repliedToId: tweet.id }),
        onSuccess: async (replyData, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKey });
            
            // Process @Korn mentions after reply is created
            if (replyData) {
                await processKornMention(replyData, variables.text);
            }
        },
        onError: (error) => console.log(error),
    });

    const handlePhotoChange = (file: File) => {
        setPhotoFile(file);
    };

    const validationSchema = yup.object({
        text: yup
            .string()
            .max(280, "Reply text should be of maximum 280 characters length.")
            .required("Reply text can't be empty."),
    });

    const formik = useFormik({
        initialValues: {
            text: "",
            authorId: token.id,
            photoUrl: "",
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            if (photoFile) {
                const path: string | void = await uploadFile(photoFile);
                if (!path) throw new Error("Error uploading image.");
                values.photoUrl = path;
                setPhotoFile(null);
            }
            mutation.mutate({ text: values.text, photoFile: photoFile || undefined });
            resetForm();
            setShowDropzone(false);
            setShowPicker(false);
            setCount(0);
        },
    });

    const customHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCount(e.target.value.length);
        formik.handleChange(e);
    };

    if (formik.isSubmitting) {
        return <CircularLoading />;
    }

    return (
        <div className="new-tweet-form new-reply">
            <Avatar
                className="avatar div-link"
                sx={{ width: 50, height: 50 }}
                alt=""
                src={token.photoUrl ? getFullURL(token.photoUrl) : "/assets/egg.jpg"}
            />
            <form onSubmit={formik.handleSubmit}>
                <div className="input">
                    <TextField
                        placeholder="Post your reply"
                        multiline
                        minRows={1}
                        variant="standard"
                        fullWidth
                        name="text"
                        value={formik.values.text}
                        onChange={customHandleChange}
                        error={formik.touched.text && Boolean(formik.errors.text)}
                        helperText={formik.touched.text && formik.errors.text}
                        hiddenLabel
                    />
                </div>
                <div className="input-additions">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowDropzone(true);
                        }}
                        className="icon-hoverable"
                    >
                        <FaRegImage />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            setShowPicker(!showPicker);
                        }}
                        className="icon-hoverable"
                    >
                        <FaRegSmile />
                    </button>
                    <ProgressCircle maxChars={280} count={count} />
                    <button className={`btn ${formik.isValid ? "" : "disabled"}`} disabled={!formik.isValid} type="submit">
                        Reply
                    </button>
                </div>
                {showPicker && (
                    <div className="emoji-picker">
                        <Picker
                            data={data}
                            onEmojiSelect={(emoji: any) => {
                                formik.setFieldValue("text", formik.values.text + emoji.native);
                                setShowPicker(false);
                            }}
                            previewPosition="none"
                        />
                    </div>
                )}
                {showDropzone && <Uploader handlePhotoChange={handlePhotoChange} />}
                {
                    <Link className="reply-to" href={`/${tweet.author.username}`}>
                        Replying to <span className="mention">@{tweet.author.username}</span>
                    </Link>
                }
            </form>
        </div>
    );
}
