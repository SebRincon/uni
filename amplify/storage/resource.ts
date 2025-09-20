import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'twitter-clone-media',
  access: (allow) => ({
    'media/{entity_id}/*': [
      allow.guest.to(['read']), // Allow everyone to read all files
      allow.authenticated.to(['read', 'write', 'delete']) // Authenticated users have full access
    ],
  })
});