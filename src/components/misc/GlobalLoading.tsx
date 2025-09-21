import Image from "next/image";

export default function GlobalLoading() {
    return (
        <div className="global-loading-wrapper">
            <Image src="/assets/unicorn-head-white.png" alt="" width={40} height={40} className="bird" />
        </div>
    );
}
