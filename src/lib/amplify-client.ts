import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

// Create a typed GraphQL client
export const client = generateClient<Schema>();

// Export the Schema type for use in other files
export type { Schema };

// Helper type to get model types from schema
export type Models = Schema[''];