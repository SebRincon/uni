"use client";
import { useState, useEffect } from "react";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AuthProps, VerifiedToken } from "@/types/TokenProps";
import { UserProps } from "@/types/UserProps";

export default function useAuth(): AuthProps {
  const [token, setToken] = useState<VerifiedToken>(null);
  const [isPending, setIsPending] = useState(true);

  const getVerifiedToken = async () => {
    setIsPending(true);
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      // This is a simplified mapping. You might need to adjust based on your custom attributes.
      const userProfile: UserProps = {
          id: user.userId,
          username: user.username,
          name: attributes.name || '',
          description: attributes['custom:description'] || '',
          location: attributes['custom:location'] || '',
          website: attributes['custom:website'] || '',
          isPremium: attributes['custom:isPremium'] === 'true' || false,
          photoUrl: attributes.picture || '',
          headerUrl: attributes['custom:headerUrl'] || '',
          // These are relational and need to be fetched separately when needed.
          followers: [],
          following: [],
          // Timestamps from Cognito are numbers (seconds since epoch), convert them
          createdAt: attributes.updated_at ? new Date(attributes.updated_at) : new Date(),
          updatedAt: attributes.updated_at ? new Date(attributes.updated_at) : new Date(),

      };
      setToken(userProfile);
    } catch (error) {
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