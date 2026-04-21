# Firebase Security Specification - Awtar Music App

## 1. Data Invariants
- A song cannot exist without a valid `ownerId` that matches the authenticated user.
- Users can only read and write their own user profile.
- Songs are private to the owner (or public if we decide, but for now, let's keep it "my tracks"). Let's make them private so a student can only see their own uploaded tracks.

## 2. The "Dirty Dozen" Payloads (Deny cases)
1. Creating a song with a different `ownerId`.
2. Updating a song's `ownerId` to someone else.
3. Reading another user's song.
4. Reading another user's profile.
5. Creating a song with a title longer than 200 characters.
6. Deleting a song that doesn't belong to the user.
7. Creating a user profile for a different UID.
8. Injecting a massive string into a document ID.
9. Updating a song's `createdAt` timestamp.
10. Creating a song without being logged in.
11. Creating a song with an invalid genre type (not a string).
12. Listing all songs without filtering by `ownerId`.

## 3. Implementation Plan
- Helper functions for `isSignedIn()`, `isOwner(userId)`, `isValidId(id)`.
- `isValidSong(data)` validation helper.
- `affectedKeys().hasOnly()` for updates to ensure `ownerId` and `createdAt` are immutable.
