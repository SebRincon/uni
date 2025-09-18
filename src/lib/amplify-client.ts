import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Don't create client on import, create it when needed
export function getClient() {
  return generateClient<Schema>();
}

// For backward compatibility, create a getter
export const client = {
  get models() {
    return getClient().models;
  }
};

// Export the Schema type for use in other files
export type { Schema };

// Helper type to get model types from schema
// export type Models = Schema[''];