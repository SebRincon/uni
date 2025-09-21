"use client";

import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Autocomplete, Chip, TextField } from "@mui/material";
import { majorOptions as MASTER_MAJOR_OPTIONS } from "@/constants/academics";

import Tweets from "@/components/tweet/Tweets";
import { getAllTweets, searchAdvanced } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import NewTweet from "@/components/tweet/NewTweet";
import { AuthContext } from "../auth-context";

export default function HomePage() {
    const { token, isPending } = useContext(AuthContext);

    const userUniversity = token?.university?.trim() || "";
    const userMajors = Array.isArray(token?.majors) ? token!.majors : [];

    // Multi-select majors: default to user's majors; if none, default to ["All"]
    const [selectedMajors, setSelectedMajors] = React.useState<string[]>(() => (userMajors && userMajors.length > 0 ? userMajors : ["All"]));

    // Catalog for major options (within user's university if present, else global)
    const { data: catalogData } = useQuery({
        queryKey: ["tweets", "catalog", userUniversity || "all"],
        queryFn: () => getAllTweets(),
    });

    const availableMajors = React.useMemo(() => {
        const set = new Set<string>(MASTER_MAJOR_OPTIONS);
        (catalogData || [])
            .forEach((t: any) => {
                if (t.course && typeof t.course === 'string' && t.course.trim() !== '') {
                    t.course.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((c: string) => set.add(c));
                }
            });
        // Ensure user's majors appear even if not in catalog
        userMajors.forEach((m) => set.add(m));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [catalogData, userMajors]);

    const queryKey = ["tweets", "home", userUniversity, [...selectedMajors].sort().join('|')];

    const { isLoading, data } = useQuery({
        queryKey,
        queryFn: () => {
            const courses = selectedMajors.includes("All") ? undefined : selectedMajors;
            if (userUniversity) {
                return searchAdvanced({ university: userUniversity, course: courses });
            }
            // No university on profile: show across all universities
            return searchAdvanced({ course: courses });
        },
        select: (res: any) => res?.tweets ?? res // normalize
    });

    if (isPending || isLoading) return <CircularLoading />;

    const tweets = (data || []).map((tweet: any) => ({
        ...tweet,
        likedBy: [],
        retweets: [],
        replies: [],
        retweetedBy: [],
        retweetedById: '',
        retweetOf: tweet.retweetOf || null,
        repliedTo: tweet.repliedTo || null,
        createdAt: new Date(tweet.createdAt)
    })).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

    return (
        <main>
            <h1 className="page-name">Home</h1>
            {token && <NewTweet token={token} />}

            <div style={{ display: 'grid', gap: 8, margin: '8px 0 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {userUniversity ? (
                        <>
                            <span className="text-muted">University:</span>
                            <Chip label={userUniversity} size="small" variant="outlined" color="primary" />
                        </>
                    ) : (
                        <span className="text-muted">Showing all universities</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="text-muted">Majors:</span>
                    <div style={{ minWidth: 280, flex: '1 1 280px', maxWidth: 520 }}>
                    <Autocomplete
                            multiple
                            options={["All", ...availableMajors]}
                            value={selectedMajors}
                            onChange={(_, value) => {
                                const vals = Array.from(new Set(value));
                                if (vals.length === 0) {
                                    setSelectedMajors(["All"]);
                                } else if (vals.includes("All")) {
                                    setSelectedMajors(["All"]);
                                } else {
                                    setSelectedMajors(vals);
                                }
                            }}
                            renderTags={(value: readonly string[], getTagProps) =>
                                value.map((option: string, index: number) => {
                                    const { key, ...chipProps } = getTagProps({ index });
                                    return (
                                        <Chip key={`${option}-${index}`} variant="outlined" label={option} {...chipProps} />
                                    );
                                })
                            }
                            renderOption={(props, option) => {
                                const { key, ...liProps } = props as any;
                                return <li key={key as any} {...liProps}>{option}</li>;
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Majors"
                                    placeholder={selectedMajors.length > 0 && !selectedMajors.includes("All") ? '' : 'Select one or more majors'}
                                    helperText="Filter timeline by majors"
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            {tweets.length === 0 && <NothingToShow />}
            <Tweets tweets={tweets} />
        </main>
    );
}
