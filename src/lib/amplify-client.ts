import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Create clients on demand, allowing different auth modes
export function getClient(authMode?: 'userPool' | 'apiKey') {
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
