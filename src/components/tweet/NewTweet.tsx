import { useState } from "react";
import { TextField, Avatar, FormControlLabel, Switch, MenuItem, Autocomplete, Chip } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FaRegImage, FaRegSmile } from "react-icons/fa";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import CircularLoading from "../misc/CircularLoading";
import { createTweet } from "@/utilities/fetch";
import { NewTweetProps } from "@/types/TweetProps";
import Uploader from "../misc/Uploader";
import ProgressCircle from "../misc/ProgressCircle";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { useKornMentionDetection } from "@/hooks/useKornAI";

import { universityOptions, majorOptions } from "@/constants/academics";

export default function NewTweet({ token, handleSubmit }: NewTweetProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [showDropzone, setShowDropzone] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [count, setCount] = useState(0);

    const queryClient = useQueryClient();
    const { shouldTriggerKornResponse } = useKornMentionDetection();

    // Function to process Korn AI mentions
    const processKornMention = async (tweetData: any, tweetText: string) => {
        if (shouldTriggerKornResponse(tweetText, token.username)) {
            try {
                console.log('🤖 Processing @Korn mention for tweet:', tweetData.id);
                
                const response = await fetch('/api/ai/korn-mention', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tweetId: tweetData.id,
                        authorId: token.id,
                        authorUsername: token.username,
                        content: tweetText,
                        isReply: false
                    })
                });

                const result = await response.json();
                
                if (!response.ok) {
                    console.error('🤖 Korn AI API error:', response.status, result);
                    if (response.status === 503) {
                        console.error('🔧 Korn AI service not available. Check environment variables.');
                    }
                    return;
                }
                
                if (result.success && result.response?.responseContent) {
                    console.log('🤖 Korn AI responded:', result.response.responseContent);
                    
                    try {
                        // Create Korn's reply tweet
                        await createTweet(
                            'KornAI', // Korn AI user account
                            result.response.responseContent,
                            undefined, // no photo
                            tweetData.id // reply to the original tweet
                        );
                        
                        console.log('✅ Korn AI reply posted successfully');
                        
                        // Refresh tweets to show the AI response
                        queryClient.invalidateQueries({ queryKey: ["tweets"] });
                    } catch (createError) {
                        console.error('❌ Error creating Korn AI reply:', createError);
                        console.error('💡 Make sure the "KornAI" user account exists in your database');
                    }
                } else {
                    console.log('🤖 Korn AI processing failed or no response');
                }
            } catch (error) {
                console.error('🤖 Error processing Korn mention:', error);
            }
        }
    };

    const mutation = useMutation({
        mutationFn: ({ authorId, text, photoFile, extras }: { authorId: string; text: string; photoFile?: File; extras?: { tags?: string[]; isAcademic?: boolean; university?: string; course?: string } }) => 
            createTweet(authorId, text, photoFile, undefined, extras),
        onSuccess: async (tweetData, variables) => {
            queryClient.invalidateQueries({ queryKey: ["tweets"] });
            
            // Process @Korn mentions after tweet is created
            if (tweetData) {
                await processKornMention(tweetData, variables.text);
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
            .max(280, "Tweet text should be of maximum 280 characters length.")
            .required("Tweet text can't be empty."),
    });

    const formik = useFormik({
        initialValues: {
            text: "",
            authorId: token.id,
            photoUrl: "",
            tagsText: "",
            isAcademic: true,
            university: "",
            majors: [] as string[],
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            const tags = values.tagsText
                .split(',')
                .map((t) => t.trim())
                .filter((t) => t.length > 0);
            mutation.mutate({
                authorId: values.authorId,
                text: values.text,
                photoFile: photoFile || undefined,
                extras: {
                    tags,
                    isAcademic: values.isAcademic,
                    university: values.university || undefined,
                    course: values.isAcademic
                        ? ((values as any).majors && (values as any).majors.length > 0
                            ? (values as any).majors.join(", ")
                            : undefined)
                        : undefined,
                }
            });
            resetForm();
            setCount(0);
            setShowDropzone(false);
            setPhotoFile(null);
            if (handleSubmit) handleSubmit();
        },
    });

    const customHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCount(e.target.value.length);
        formik.handleChange(e);
    };

    // Always call hooks in the same order before any conditional returns
    const avatarUrl = useStorageUrl(token.photoUrl);

    if (formik.isSubmitting) {
        return <CircularLoading />;
    }

    return (
        <div className="new-tweet-form">
            <Avatar
                className="avatar div-link"
                sx={{ width: 50, height: 50 }}
                alt=""
                src={avatarUrl}
            />
            <form onSubmit={formik.handleSubmit}>
                <div className="input">
                    <TextField
                        placeholder="What's happening?"
                        multiline
                        hiddenLabel
                        minRows={3}
                        variant="standard"
                        fullWidth
                        name="text"
                        value={formik.values.text}
                        onChange={customHandleChange}
                        error={formik.touched.text && Boolean(formik.errors.text)}
                        helperText={formik.touched.text && formik.errors.text}
                    />
                </div>
                {/* Tagging and academic context */}
                <div className="input" style={{ marginTop: 8 }}>
                    <TextField
                        placeholder="Tags (comma-separated, e.g. hackathon, advice, internship)"
                        hiddenLabel
                        variant="standard"
                        fullWidth
                        name="tagsText"
                        value={(formik.values as any).tagsText}
                        onChange={formik.handleChange}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 8 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={(formik.values as any).isAcademic}
                                    onChange={(e) => formik.setFieldValue('isAcademic', e.target.checked)}
                                    name="isAcademic"
                                />
                            }
                            label="Academic post"
                        />
                        <TextField
                            select
                            fullWidth
                            hiddenLabel
                            variant="standard"
                            name="university"
                            value={(formik.values as any).university}
                            onChange={formik.handleChange}
                            SelectProps={{
                                displayEmpty: true,
                                renderValue: (selected) => {
                                    if (!selected) {
                                        return 'Select a university';
                                    }
                                    return selected as string;
                                },
                            }}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {universityOptions.map((u) => (
                                <MenuItem key={u} value={u}>{u}</MenuItem>
                            ))}
                        </TextField>
                        {(formik.values as any).isAcademic && (
                            <Autocomplete
                                multiple
                                options={majorOptions}
                                value={(formik.values as any).majors || []}
                                onChange={(_, value) => formik.setFieldValue('majors', value)}
                                fullWidth
                                renderTags={(value: readonly string[], getTagProps) =>
                                    value.map((option: string, index: number) => (
                                        <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        hiddenLabel
                                        variant="standard"
                                        placeholder={(formik.values as any).majors?.length > 0 ? '' : 'Select one or more majors'}
                                        helperText="You can select multiple majors"
                                    />
                                )}
                            />
                        )}
                    </div>
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
                        Tweet
                    </button>
                </div>
                {showPicker && (
                    <div className="emoji-picker">
                        <Picker
                            data={data}
                            onEmojiSelect={(emoji: any) => {
                                formik.setFieldValue("text", formik.values.text + emoji.native);
                                setShowPicker(false);
                                setCount(count + emoji.native.length);
                            }}
                            previewPosition="none"
                        />
                    </div>
                )}
                {showDropzone && <Uploader handlePhotoChange={handlePhotoChange} />}
            </form>
        </div>
    );
}
