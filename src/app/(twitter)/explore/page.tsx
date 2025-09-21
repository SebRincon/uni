"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useContext, useMemo } from "react";
import { Autocomplete, Chip, MenuItem, TextField } from "@mui/material";

import { getAllTweets, searchAdvanced } from "@/utilities/fetch";
import { universityOptions as MASTER_UNIVERSITIES, majorOptions as MASTER_MAJORS } from "@/constants/academics";
import NewTweet from "@/components/tweet/NewTweet";
import Tweets from "@/components/tweet/Tweets";
import { AuthContext } from "../auth-context";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import { dedupeAndSortByCreatedAtDesc } from "@/utilities/tweet/sort";
import { TweetProps } from "@/types/TweetProps";

export default function ExplorePage() {
    const { token, isPending } = useContext(AuthContext);

    // Option catalogs from a sample of tweets
    const { data: catalogData, isLoading: isLoadingCatalog } = useQuery({
        queryKey: ["tweets", "catalog"],
        queryFn: () => getAllTweets(),
    });

    const [selectedUniversity, setSelectedUniversity] = React.useState<string>(""); // empty = All universities
    const [selectedMajors, setSelectedMajors] = React.useState<string[]>(["All"]);

    const universities = useMemo(() => {
        const u = new Set<string>(MASTER_UNIVERSITIES);
        (catalogData || []).forEach((t: any) => {
            if (t.university && typeof t.university === 'string' && t.university.trim() !== '') u.add(t.university);
        });
        return Array.from(u).sort((a, b) => a.localeCompare(b));
    }, [catalogData]);

    const availableMajors = useMemo(() => {
        const m = new Set<string>(MASTER_MAJORS);
        (catalogData || [])
            .filter((t: any) => !selectedUniversity || t.university === selectedUniversity)
            .forEach((t: any) => {
                const c = t.course;
                if (c && typeof c === 'string' && c.trim() !== '') {
                    c.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((part: string) => m.add(part));
                }
            });
        return Array.from(m).sort((a, b) => a.localeCompare(b));
    }, [catalogData, selectedUniversity]);

    // Tweets to show based on selected filters
    const { data, isLoading } = useQuery({
        queryKey: ["tweets", "explore", selectedUniversity, [...selectedMajors].sort().join('|')],
        queryFn: () => searchAdvanced({
            university: selectedUniversity || undefined,
            course: (selectedMajors.length === 0 || selectedMajors.includes('All')) ? undefined : selectedMajors,
        }),
        select: (res: any) => res?.tweets ?? res
    });

    const tweets = useMemo((): TweetProps[] => {
        const mapped = (data || []).map((tweet: any) => ({
            ...tweet,
            likedBy: [],
            retweets: [],
            replies: [],
            retweetedBy: [],
            retweetedById: '',
            retweetOf: tweet.retweetOf || null,
            repliedTo: tweet.repliedTo || null,
            createdAt: new Date(tweet.createdAt)
        })) as TweetProps[];
        return dedupeAndSortByCreatedAtDesc<TweetProps>(mapped);
    }, [data]);

    if (isPending) return <CircularLoading />;

    return (
        <main className="page">
            <div className="page-header">
                <h1>Explore</h1>
            </div>

            <section className="page-filters">
                <div className="filters-row">
                    <span className="label">University</span>
                    <div className="field">
                        <TextField
                            select
                            value={selectedUniversity}
                            onChange={(e) => { setSelectedUniversity(e.target.value); setSelectedMajors(['All']); }}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="">All universities</MenuItem>
                            {universities.map((u) => (
                                <MenuItem key={u} value={u}>{u}</MenuItem>
                            ))}
                        </TextField>
                    </div>
                </div>
                <div className="filters-row">
                    <span className="label">Majors</span>
                    <div className="field">
                        <Autocomplete
                            multiple
                            options={["All", ...availableMajors]}
                            value={selectedMajors}
                            onChange={(_, value, reason, details) => {
                                let vals = Array.from(new Set(value));
                                // If user explicitly selected 'All', make it the sole selection
                                if (reason === 'selectOption' && details && (details as any).option === 'All') {
                                    setSelectedMajors(["All"]);
                                    return;
                                }
                                // If 'All' is present with other majors, drop 'All'
                                if (vals.includes("All") && vals.length > 1) {
                                    vals = vals.filter((v) => v !== "All");
                                }
                                // Allow clearing to an empty selection (treated as no filter)
                                setSelectedMajors(vals);
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
                                    placeholder={selectedMajors.length > 0 && !selectedMajors.includes("All") ? '' : 'Select one or more majors'}
                                />
                            )}
                        />
                    </div>
                </div>
            </section>


            <section className="content-section">
                {isLoadingCatalog || isLoading ? (
                    <CircularLoading />
                ) : (
                    <>
                        {tweets.length === 0 && <NothingToShow />}
                        <Tweets tweets={tweets} />
                    </>
                )}
            </section>
        </main>
    );
}
