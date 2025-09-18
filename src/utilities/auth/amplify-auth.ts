import { getCurrentUser, signIn, signOut, signUp, confirmSignUp, AuthUser } from 'aws-amplify/auth';
import { client } from '@/lib/amplify-client';
import type { Schema } from '../../lib/amplify-client';

type User = any; // Schema['User']['type'];

export interface AuthPayload {
  id: string;
  username: string;
  email: string;
  user?: User;
}

/**
 * Sign up a new user with Amplify Auth
 */
export async function amplifySignUp(username: string, email: string, password: string) {
  try {
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: email, // Use email as username for Cognito
      password,
      options: {
        userAttributes: {
          email,
          preferred_username: username, // Store the actual username as preferred_username
        }
      }
    });

    return {
      success: true,
      isSignUpComplete,
      userId,
      nextStep
    };
  } catch (error) {
    console.error('Error signing up:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Confirm sign up with verification code
 */
export async function amplifyConfirmSignUp(username: string, confirmationCode: string) {
  try {
    const { isSignUpComplete } = await confirmSignUp({
      username,
      confirmationCode
    });
    
    return {
      success: true,
      isSignUpComplete
    };
  } catch (error) {
    console.error('Error confirming sign up:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sign in a user with Amplify Auth
 */
export async function amplifySignIn(username: string, password: string) {
  try {
    const { isSignedIn, nextStep } = await signIn({ username, password });
    
    if (isSignedIn) {
      // Get the current authenticated user
      const authUser = await getCurrentUser();
      
      // Create or get the user in our database
      const dbUser = await getOrCreateDatabaseUser(authUser);
      
      return {
        success: true,
        user: dbUser,
        authUser
      };
    }
    
    return {
      success: true,
      isSignedIn,
      nextStep
    };
  } catch (error) {
    console.error('Error signing in:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sign out the current user
 */
export async function amplifySignOut() {
  try {
    await signOut();
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get the current authenticated user
 */
export async function getAmplifyCurrentUser(): Promise<AuthPayload | null> {
  try {
    const authUser = await getCurrentUser();
    
    // Get the user from our database
    const { data: users } = await client.models.User.list({
      filter: {
        username: {
          eq: authUser.signInDetails?.loginId || ''
        }
      }
    });
    
    if (users && users.length > 0) {
      const dbUser = users[0];
      return {
        id: (dbUser as any).id,
        username: (dbUser as any).username,
        email: authUser.signInDetails?.loginId || '',
        user: dbUser
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get or create a user in our database based on Cognito user
 */
async function getOrCreateDatabaseUser(authUser: AuthUser): Promise<User | null> {
  try {
    const email = authUser.signInDetails?.loginId || '';
    const username = authUser.username || email.split('@')[0];
    
    // Try to find existing user
    const { data: existingUsers } = await client.models.User.list({
      filter: {
        username: {
          eq: username
        }
      }
    });
    
    if (existingUsers && existingUsers.length > 0) {
      return existingUsers[0] as any;
    }
    
    // Create new user
    const { data: newUser } = await client.models.User.create({
      username,
      name: username,
      isPremium: false
    });
    
    return newUser as any;
  } catch (error) {
    console.error('Error getting/creating database user:', error);
    return null;
  }
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const { data: users } = await client.models.User.list({
      filter: {
        username: {
          eq: username
        }
      }
    });
    
    return !users || users.length === 0;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}