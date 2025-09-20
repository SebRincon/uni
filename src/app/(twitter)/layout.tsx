"use client";

import { createContext } from "react";

import Footer from "@/components/layout/Footer";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import { AuthProps } from "@/types/TokenProps";
import useAuth from "@/hooks/useAuth";

const AuthContext = createContext<AuthProps>({ token: null, isPending: true, refreshToken: async () => {} });

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    const auth = useAuth();
    
    // Debug auth state
    console.log('🏠 HomeLayout Auth State:', {
        token: auth.token,
        isPending: auth.isPending,
        hasToken: !!auth.token
    });

    return (
        <AuthContext.Provider value={auth}>
            <div className="layout">
                <LeftSidebar />
                {children}
                <RightSidebar />
                <Footer />
            </div>
        </AuthContext.Provider>
    );
}

export { AuthContext };
