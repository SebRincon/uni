"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { searchAdvanced } from "@/utilities/fetch";
import CircularLoading from "@/components/misc/CircularLoading";
import NothingToShow from "@/components/misc/NothingToShow";
import Tweets from "@/components/tweet/Tweets";
import BackToArrow from "@/components/misc/BackToArrow";

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const q = searchParams?.get("q") || "";
    const tagsParam = searchParams?.get("tags") || ""; // comma-separated
    const university = searchParams?.get("university") || "";
    const course = searchParams?.get("course") || "";
    const academicOnlyParam = searchParams?.get("academicOnly");
    const academicOnly = academicOnlyParam === 'true' ? true : academicOnlyParam === 'false' ? false : undefined;

    const tags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

    const queryKey = ["search", q, tags.join('|'), university, course, String(academicOnly)];

    const { data, isLoading, isFetched } = useQuery({
        queryKey: queryKey,
        queryFn: () => searchAdvanced({ q, tags, university, course, academicOnly }),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget as any;
        const next = new URLSearchParams(searchParams?.toString());
        next.set('q', form.q.value || '');
        next.set('tags', form.tags.value || '');
        if (form.university.value) next.set('university', form.university.value); else next.delete('university');
        if (form.course.value) next.set('course', form.course.value); else next.delete('course');
        const ac = form.academicOnly.checked;
        next.set('academicOnly', String(ac));
        router.replace(`/search?${next.toString()}`);
    };

    return (
        <main>
            <BackToArrow title="Search results" url="/explore" />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 16px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input name="q" defaultValue={q} placeholder="Search text" style={{ flex: 2, padding: 8, borderRadius: 8, border: '1px solid var(--border-color, #ddd)' }} />
                    <input name="tags" defaultValue={tagsParam} placeholder="tags (comma-separated)" style={{ flex: 2, padding: 8, borderRadius: 8, border: '1px solid var(--border-color, #ddd)' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input name="university" defaultValue={university} placeholder="University (optional)" style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border-color, #ddd)' }} />
                    <input name="course" defaultValue={course} placeholder="Course/Major (optional)" style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border-color, #ddd)' }} />
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" name="academicOnly" defaultChecked={academicOnly === true} /> Academic only
                    </label>
                    <button className="btn" type="submit">Apply</button>
                </div>
            </form>

            {isFetched && data && (!data.tweets || data.tweets.length === 0) && <NothingToShow />}
            {isLoading ? <CircularLoading /> : data && (() => {
                const mappedTweets = (data.tweets || [])
                    .map((tweet: any) => ({
                        ...tweet,
                        likedBy: [],
                        retweets: [],
                        replies: [],
                        retweetedBy: [],
                        retweetedById: '',
                        retweetOf: tweet.retweetOf || null,
                        repliedTo: tweet.repliedTo || null,
                        createdAt: new Date(tweet.createdAt)
                    }))
                    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
                return <Tweets tweets={mappedTweets} />;
            })()}
        </main>
    );
}
