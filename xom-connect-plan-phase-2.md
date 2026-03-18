You are a senior full-stack engineer.

Help me implement a social network feed system with the following authentication behavior.

Users can browse the feed without logging in, but only logged-in users can create posts.

1. User Access Rules
Guest Users (Not Logged In)

Guests are allowed to:

View Global Feed

View Nearby Feed

Scroll posts

View images/videos

Read comments

Guests are NOT allowed to:

Create posts

Like posts

Comment

Repost

When a user is not logged in, the UI must:

Hide the Post Composer

Hide the "Đăng" button

2. Logged-In Users

After successful login users can:

Create posts

Like posts

Comment

Repost

Access their profile

The UI must show the Post Composer at the top of the feed.

Example UI:

--------------------------------
Avatar   Có gì mới?      [Đăng]
--------------------------------

Clicking the input opens the full post editor.

6. UX Goals

The platform should allow content discovery without forcing login, but posting requires authentication.

This improves:

User engagement

Content visibility

User conversion

Expected Implementation

Generate:

Feed Page UI

Auth state detection

Conditional Post Composer

Global feed API integration

Nearby feed API integration

Login prompt modal