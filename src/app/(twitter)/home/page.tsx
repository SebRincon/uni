"use client";

import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Autocomplete, Chip, MenuItem, TextField } from "@mui/material";
import { majorOptions as MASTER_MAJOR_OPTIONS, universityOptions as MASTER_UNIVERSITIES } from "@/constants/academics";

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

    // Filters state: default to user's context for Home
    const [selectedUniversity, setSelectedUniversity] = React.useState<string>(userUniversity);
    const [selectedMajors, setSelectedMajors] = React.useState<string[]>(() => (userMajors && userMajors.length > 0 ? userMajors : ["All"]));

    // Catalog for option building
    const { data: catalogData } = useQuery({
        queryKey: ["tweets", "catalog", userUniversity || "all"],
        queryFn: () => getAllTweets(),
    });

    // University options (match Explore formatting)
    const universities = React.useMemo(() => {
        const u = new Set<string>(MASTER_UNIVERSITIES);
        (catalogData || []).forEach((t: any) => {
            if (t.university && typeof t.university === 'string' && t.university.trim() !== '') u.add(t.university);
        });
        return Array.from(u).sort((a, b) => a.localeCompare(b));
    }, [catalogData]);

    // Major options: keep Home behavior (not restricted by selected university)
    const availableMajors = React.useMemo(() => {
        const set = new Set<string>(MASTER_MAJOR_OPTIONS);
        (catalogData || []).forEach((t: any) => {
            if (t.course && typeof t.course === 'string' && t.course.trim() !== '') {
                t.course.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((c: string) => set.add(c));
            }
        });
        // Ensure user's majors appear even if not in catalog
        userMajors.forEach((m) => set.add(m));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [catalogData, userMajors]);

    // Query: keep Home-specific behavior (defaulting to user's university if present)
    const queryKey = ["tweets", "home", selectedUniversity, [...selectedMajors].sort().join('|')];

    const { isLoading, data } = useQuery({
        queryKey,
        queryFn: () => {
                const courses = (selectedMajors.length === 0 || selectedMajors.includes("All")) ? undefined : selectedMajors;
                return searchAdvanced({ university: selectedUniversity || undefined, course: courses });
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
        <main className="page">
            <div className="page-header">
                <h1>Home</h1>
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
                            fullWidth
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
                {tweets.length === 0 && <NothingToShow />}
                <Tweets tweets={tweets} />
            </section>
        </main>
    );
}
