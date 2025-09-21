"use client";
import { useState, useEffect } from "react";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AuthProps, VerifiedToken } from "@/types/TokenProps";
import { UserProps } from "@/types/UserProps";
import { getClient } from '@/lib/amplify-client';

export default function useAuth(): AuthProps {
  const [token, setToken] = useState<VerifiedToken>(null);
  const [isPending, setIsPending] = useState(true);

  const getVerifiedToken = async () => {
    setIsPending(true);
    try {
      console.log('🔍 Getting current user...');
      const user = await getCurrentUser();
      console.log('✅ Current user:', user);
      
      const attributes = await fetchUserAttributes();
      console.log('✅ User attributes:', attributes);
      
      // Get the username from attributes
      const username = attributes.preferred_username || user.username;
      console.log('📝 Username:', username);
      
      // Add retry logic for database operations
      let retries = 3;
      while (retries > 0) {
        try {
          // Try to find the user in our database
          console.log('🔍 Looking for user in database...');
          // Use public (apiKey) client for reads and authenticated (userPool) client for writes
          const publicClient = getClient('apiKey');
          const authedClient = getClient('userPool');

          const listResult = await publicClient.models.User.list({
            filter: {
              username: {
                eq: username
              }
            }
          });
          const users = listResult?.data;
          console.log('📊 Database response:', users);
          
          if (users && users.length > 0) {
            const dbUser = users[0];
            console.log('✅ Found user in database:', dbUser);

const userSelectionSet = ['username', 'name', 'description', 'location', 'website', 'photoUrl', 'headerUrl', 'isPremium', 'university', 'majors', 'createdAt', 'updatedAt'] as const;

            // Build friends and pending via Friendship model
            const { data: friendshipsA } = await publicClient.models.Friendship.list({
                filter: { userAId: { eq: (dbUser as any).username } }
            });
            const { data: friendshipsB } = await publicClient.models.Friendship.list({
                filter: { userBId: { eq: (dbUser as any).username } }
            });
            const allFriendships = [ ...(friendshipsA || []), ...(friendshipsB || []) ];

            const getUserByUsername = async (u: string) => {
                const res = await publicClient.models.User.get({ username: u }, { selectionSet: userSelectionSet });
                const user = res.data as any;
                return user ? {
                    ...user,
                    id: user.username,
                    friends: [],
                    pendingIncoming: [],
                    pendingOutgoing: [],
                    createdAt: new Date(user.createdAt || Date.now()),
                    updatedAt: new Date(user.updatedAt || Date.now()),
                } as UserProps : null;
            };

            const friends: UserProps[] = [];
            const pendingIncoming: UserProps[] = [];
            const pendingOutgoing: UserProps[] = [];

            for (const f of allFriendships) {
                const otherId = f.userAId === (dbUser as any).username ? f.userBId : f.userAId;
                const otherUser = await getUserByUsername(otherId);
                if (!otherUser) continue;
                if (f.status === 'accepted') {
                    friends.push(otherUser);
                } else if (f.status === 'pending') {
                    if (f.requesterId === (dbUser as any).username) pendingOutgoing.push(otherUser);
                    else pendingIncoming.push(otherUser);
                }
            }

const userProfile: UserProps = {
              id: (dbUser as any).username,
              username: (dbUser as any).username,
              name: (dbUser as any).name || '',
              description: (dbUser as any).description || '',
              location: (dbUser as any).location || '',
              website: (dbUser as any).website || '',
              university: (dbUser as any).university || '',
              majors: (dbUser as any).majors || [],
              isPremium: (dbUser as any).isPremium || false,
              photoUrl: (dbUser as any).photoUrl || '',
              headerUrl: (dbUser as any).headerUrl || '',
              friends,
              pendingIncoming,
              pendingOutgoing,
              createdAt: new Date((dbUser as any).createdAt || Date.now()),
              updatedAt: new Date((dbUser as any).updatedAt || Date.now()),
            };
            console.log('👤 Setting user profile:', userProfile);
            setToken(userProfile);
            return; // Success, exit the function
          } else {
            // If user doesn't exist in DB, create them
            console.log('❌ User not found in database, creating new user...');
            console.log('📝 Creating user with data:', {
              username: username,
              name: attributes.name || username,
              isPremium: false,
            });
            
            try {
const createResult = await authedClient.models.User.create({
                username: username,
                name: attributes.name || username,
                isPremium: false,
                university: '',
                majors: [],
              });
              console.log('✅ Create result:', createResult);
              const newUser = createResult?.data;
              console.log('✅ Created new user:', newUser);
            
              if (newUser) {
const userProfile: UserProps = {
                  id: (newUser as any).username, // username is the primary key in Amplify
                  username: (newUser as any).username,
                  name: (newUser as any).name || '',
                  description: (newUser as any).description || '',
                  location: (newUser as any).location || '',
                  website: (newUser as any).website || '',
                  university: (newUser as any).university || '',
                  majors: (newUser as any).majors || [],
                  isPremium: (newUser as any).isPremium || false,
                  photoUrl: (newUser as any).photoUrl || '',
                  headerUrl: (newUser as any).headerUrl || '',
                  friends: [],
                  pendingIncoming: [],
                  pendingOutgoing: [],
                  createdAt: new Date((newUser as any).createdAt || Date.now()),
                  updatedAt: new Date((newUser as any).updatedAt || Date.now()),
                };
                console.log('👤 Setting new user profile:', userProfile);
                setToken(userProfile);
                return; // Success, exit the function
              }
            } catch (createError) {
              console.error('❌ Error creating user:', createError);
              throw createError;
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