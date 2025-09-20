import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'twitter-clone-media',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']), // Public files readable by everyone
      allow.authenticated.to(['read', 'write', 'delete']) // Authenticated users can manage public files
    ],
    'protected/{entity_id}/*': [
      allow.guest.to(['read']), // Allow guests to read protected files
      allow.entity('identity').to(['read', 'write', 'delete']) // Users can manage their own protected files
    ],
  })
});