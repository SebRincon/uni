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
          id: dbUser.id,
          username: dbUser.username,
          name: dbUser.name || '',
          description: dbUser.description || '',
          location: dbUser.location || '',
          website: dbUser.website || '',
          isPremium: dbUser.isPremium || false,
          photoUrl: dbUser.photoUrl || '',
          headerUrl: dbUser.headerUrl || '',
          // These will be fetched separately when needed
          followers: [],
          following: [],
          createdAt: new Date(dbUser.createdAt),
          updatedAt: new Date(dbUser.updatedAt),
        };
        setToken(userProfile);
      } else {
        // If user doesn't exist in DB, create them
        const { data: newUser } = await client.models.User.create({
          username: username,
          name: attributes.name || username,
          isPremium: false,
        });
        
        if (newUser) {
          const userProfile: UserProps = {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name || '',
            description: newUser.description || '',
            location: newUser.location || '',
            website: newUser.website || '',
            isPremium: newUser.isPremium || false,
            photoUrl: newUser.photoUrl || '',
            headerUrl: newUser.headerUrl || '',
            followers: [],
            following: [],
            createdAt: new Date(newUser.createdAt),
            updatedAt: new Date(newUser.updatedAt),
          };
          setToken(userProfile);
        }
      }
    } catch (error) {
      console.error('Error in getVerifiedToken:', error);
      setToken(null);
    } finally {
      setIsPending(false);
    }
  };

  const refreshToken = () => {
    getVerifiedToken();
  };

  useEffect(() => {
    getVerifiedToken();

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