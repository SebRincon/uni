import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'twitter-clone-media',
  access: (allow) => ({
    'media/*': [
      allow.guest.to(['read']), // Allow everyone to read all media files
      allow.authenticated.to(['read']) // Authenticated users can also read all files
    ],
    'media/{entity_id}/*': [
      allow.entity('identity').to(['write', 'delete']) // Users can only write/delete their own files
    ],
  })
});