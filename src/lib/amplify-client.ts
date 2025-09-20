import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import type { Schema } from '../../amplify/data/resource';
import amplifyConfig from '../../amplify_outputs.json';

// Configure Amplify for both client and server-side
// This ensures Amplify is configured during build time and runtime
try {
  const config = Amplify.getConfig();
  if (!config || !config.API) {
    Amplify.configure(amplifyConfig, { ssr: true });
  }
} catch (error) {
  // If already configured, ignore the error
  console.log('Amplify configuration:', error);
}

// Create clients on demand, allowing different auth modes
export function getClient(authMode?: 'userPool' | 'apiKey') {
  // Ensure configuration before generating client
  if (!Amplify.getConfig()?.API) {
    Amplify.configure(amplifyConfig, { ssr: true });
  }
  return authMode ? generateClient<Schema>({ authMode }) : generateClient<Schema>();
}

// Authenticated client (Cognito user pool) - use for mutations
export const authClient = {
  get models() {
    return getClient('userPool').models;
  }
};

// Public client (API key) - use for reads before auth is ready
export const publicClient = {
  get models() {
    return getClient('apiKey').models;
  }
};

// Backward compatibility: default export uses authenticated client
export const client = authClient;

// Export the Schema type for use in other files
export type { Schema };

// Helper type to get model types from schema
// export type Models = Schema[''];
