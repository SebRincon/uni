// Utility to ensure KornAI user exists in the database
import { client } from '@/lib/amplify-client';

const KORN_AI_USERNAME = 'KornAI';

export interface KornUserData {
  username: string;
  name: string;
  description: string;
  isPremium: boolean;
  photoUrl?: string;
}

const DEFAULT_KORN_USER: KornUserData = {
  username: KORN_AI_USERNAME,
  name: 'Korn AI',
  description: '🤖 AI Assistant integrated with Twitter-like social platform. Mention me with @Korn for help!',
  isPremium: true, // Give Korn premium status
  photoUrl: undefined // Could add an AI avatar image later
};

/**
 * Checks if KornAI user exists and creates it if not
 * Should be called during app initialization or before first Korn AI response
 */
export async function ensureKornUserExists(): Promise<boolean> {
  try {
    console.log('🔍 Checking if KornAI user exists...');
    
    // Check if KornAI user already exists
    const { data: existingUser } = await (client.models.User as any).get({ 
      username: KORN_AI_USERNAME 
    });
    
    if (existingUser) {
      console.log('✅ KornAI user already exists');
      return true;
    }
    
    console.log('🤖 Creating KornAI user...');
    
    // Create KornAI user
    const { data: newUser } = await (client.models.User as any).create({
      username: DEFAULT_KORN_USER.username,
      name: DEFAULT_KORN_USER.name,
      description: DEFAULT_KORN_USER.description,
      isPremium: DEFAULT_KORN_USER.isPremium,
      photoUrl: DEFAULT_KORN_USER.photoUrl
    });
    
    if (newUser) {
      console.log('✅ KornAI user created successfully:', newUser.username);
      return true;
    } else {
      console.error('❌ Failed to create KornAI user');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error ensuring KornAI user exists:', error);
    return false;
  }
}

/**
 * Get the KornAI user data
 */
export async function getKornUser() {
  try {
    const { data: user } = await (client.models.User as any).get({ 
      username: KORN_AI_USERNAME 
    });
    return user;
  } catch (error) {
    console.error('Error getting KornAI user:', error);
    return null;
  }
}

/**
 * Update KornAI user data (for maintenance)
 */
export async function updateKornUser(updates: Partial<KornUserData>) {
  try {
    const { data: updatedUser } = await (client.models.User as any).update({
      username: KORN_AI_USERNAME,
      ...updates
    });
    
    console.log('✅ KornAI user updated successfully');
    return updatedUser;
  } catch (error) {
    console.error('❌ Error updating KornAI user:', error);
    return null;
  }
}