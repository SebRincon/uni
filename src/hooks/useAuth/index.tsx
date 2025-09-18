"use client";
import { useState, useEffect } from "react";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AuthProps, VerifiedToken } from "@/types/TokenProps";
import { UserProps } from "@/types/UserProps";
import { client } from '@/lib/amplify-client';

export default function useAuth(): AuthProps {
  const [token, setToken] = useState<VerifiedToken>(null);
  const [isPending, setIsPending] = useState(true);

  const getVerifiedToken = async () => {
    setIsPending(true);
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      
      // Get the username from attributes
      const username = attributes.preferred_username || user.username;
      
      // Add retry logic for database operations
      let retries = 3;
      while (retries > 0) {
        try {
          // Try to find the user in our database
          const { data: users } = await client.models.User.list({
            filter: {
              username: {
                eq: username
              }
            }
          });
          
          if (users && users.length > 0) {
            const dbUser = users[0];
            const userProfile: UserProps = {
              id: (dbUser as any).id,
              username: (dbUser as any).username,
              name: (dbUser as any).name || '',
              description: (dbUser as any).description || '',
              location: (dbUser as any).location || '',
              website: (dbUser as any).website || '',
              isPremium: (dbUser as any).isPremium || false,
              photoUrl: (dbUser as any).photoUrl || '',
              headerUrl: (dbUser as any).headerUrl || '',
              // These will be fetched separately when needed
              followers: [],
              following: [],
              createdAt: new Date((dbUser as any).createdAt || Date.now()),
              updatedAt: new Date((dbUser as any).updatedAt || Date.now()),
            };
            setToken(userProfile);
            return; // Success, exit the function
          } else {
            // If user doesn't exist in DB, create them
            const { data: newUser } = await client.models.User.create({
              username: username,
              name: attributes.name || username,
              isPremium: false,
            });
            
            if (newUser) {
              const userProfile: UserProps = {
                id: (newUser as any).id,
                username: (newUser as any).username,
                name: (newUser as any).name || '',
                description: (newUser as any).description || '',
                location: (newUser as any).location || '',
                website: (newUser as any).website || '',
                isPremium: (newUser as any).isPremium || false,
                photoUrl: (newUser as any).photoUrl || '',
                headerUrl: (newUser as any).headerUrl || '',
                followers: [],
                following: [],
                createdAt: new Date((newUser as any).createdAt || Date.now()),
                updatedAt: new Date((newUser as any).updatedAt || Date.now()),
              };
              setToken(userProfile);
              return; // Success, exit the function
            }
          }
          break; // If we get here, exit the retry loop
        } catch (dbError) {
          console.error(`Database operation failed, ${retries} retries left:`, dbError);
          retries--;
          if (retries > 0) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw dbError; // Re-throw if no retries left
          }
        }
      }
    } catch (error) {
      console.error('Error in getVerifiedToken:', error);
      setToken(null);
    } finally {
      setIsPending(false);
    }
  };

  const refreshToken = async () => {
    await getVerifiedToken();
  };

  useEffect(() => {
    // Add a small delay to ensure Amplify is configured
    const initAuth = async () => {
      // Wait a bit to ensure Amplify is configured
      await new Promise(resolve => setTimeout(resolve, 100));
      await getVerifiedToken();
    };
    
    initAuth();

    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          getVerifiedToken();
          break;
        case 'signedOut':
          setToken(null);
          break;
      }
    });

    return () => {
      hubListener();
    };
  }, []);

  return { token, isPending, refreshToken };
}