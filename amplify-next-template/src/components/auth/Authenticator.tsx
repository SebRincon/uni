"use client";
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Auth() {
  const router = useRouter();
  return (
    <Authenticator>
      {({ signOut, user }) => {
        useEffect(() => {
          if (user) {
            // After login, you might want to sync user data from Cognito to your DB model if needed
            // For now, just redirecting
            router.push('/home');
          }
        }, [user, router]);
        
        return (
            <main>
              <h1>Hello {user?.username}</h1>
              <button onClick={signOut}>Sign out</button>
            </main>
          )
      }}
    </Authenticator>
  );
}