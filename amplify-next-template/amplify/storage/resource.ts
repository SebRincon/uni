import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'twitter-clone-media',
  access: (allow) => ({
    'media/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
  })
});