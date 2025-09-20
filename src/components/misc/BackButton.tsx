"use client";

import { useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

export default function BackButton({ title }: { title: string }) {
    const router = useRouter();

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="back-to">
            <button className="icon-hoverable" onClick={handleBack} type="button">
                <FaArrowLeft />
            </button>
            <div className="top">
                <span className="top-title">{title}</span>
            </div>
        </div>
    );
}