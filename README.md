# Uni (Full‑stack Next.js 13+)

Uni is a campus‑centric social platform for sharing updates, collaborating on academics, and connecting with peers. It features posts, replies, reposts, messaging, notifications, rich media, and powerful search with university/major filters.

Built with **Next.js 13+ (App Router)**, **TypeScript**, **AWS Amplify (Data/Storage)**, **Material UI**, and **TanStack Query**. Deployable on **Vercel** or your preferred platform.

## Production

- https://main.d2384twl5hqdti.amplifyapp.com/

## Features

-   Profiles: Create a profile, upload an avatar/cover, and customize your bio.
-   Posts and Replies: Share posts (with attachments) and discuss via threaded replies.
-   Friends & Requests: Send/accept/decline friend requests; see friends’ posts on Home.
-   Likes & Reposts: Engage with likes and reposts (with undo support).
-   Notifications: For likes, reposts, replies, mentions, and friend events.
-   Search & Explore: Full‑text search plus filters by university and major(s).
-   Direct Messaging: One‑to‑one conversations.
-   Premium badge: Optional verified/premium badge next to names.
-   Emoji support: Emoji picker for posts and replies.
-   Authentication and access control: User sessions and protected actions.
-   Fast data fetching: React Query for caching, optimistic updates, and reactive UI.
-   Media & attachments: Image uploads and attachment chips (including PDFs).
-   Infinite scroll: Seamless content loading.
-   Date/time formatting: Friendly timestamps and extended date views.
-   Deleting: Remove your posts, replies, and undo reposts/likes.
-   Dark and Light modes.
-   Responsive design.

## Tech stack & libraries

-   Next.js 13+ (App Router), TypeScript
-   AWS Amplify Gen 2 (Data), Storage utilities
-   Material UI (MUI)
-   TanStack React Query
-   Framer Motion (animations)
-   Emoji Mart
-   date‑fns
-   react‑icons
-   react‑dropzone
-   ESLint + Prettier
-   Sass (SCSS)

## Roadmap

-   [x] Show verified/premium users in suggestions
-   [ ] Block/unblock users
-   [ ] Hidden/locked profiles
-   [ ] Refine infinite loading across pages
-   [ ] Improve optimistic messaging UX
-   [ ] Additional language support
-   [ ] Optional email/SMS verification

## License

Distributed under the [MIT](https://choosealicense.com/licenses/mit/) License.
