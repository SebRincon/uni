import Image from "next/image";

export default function GlobalLoading() {
    return (
        <div className="global-loading-wrapper">
            <div className="loading-animation">
                <div className="ripple ripple-1"></div>
                <div className="ripple ripple-2"></div>
                <Image src="/assets/circle-icon.svg" alt="Loading" width={64} height={64} className="pulse-circle" />
            </div>
        </div>
    );
}
