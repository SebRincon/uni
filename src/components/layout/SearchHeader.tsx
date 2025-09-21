"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BsSearch } from "react-icons/bs";

export default function SearchHeader() {
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const encodedSearchQuery = encodeURI(searchQuery);
        router.push(`/search?q=${encodedSearchQuery}`);
    };

    return (
        <header className="search-header">
            <form className="search-header-form" onSubmit={onSearch}>
                <input
                    className="search-header-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Twitter"
                    required
                />
                <BsSearch className="search-header-icon" />
            </form>
        </header>
    );
}