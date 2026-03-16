# Data Migration Notes

## Pre-Auth Data (March 2026)

Sessions and projects created before auth was added do not have a `userId` field. The schema uses `v.optional(v.id("users"))` so existing documents remain valid.

- **Behavior**: Records without `userId` are excluded from all user-scoped queries and mutations. Authenticated users will only see their own data (records with matching `userId`).
- **Legacy data**: Orphan records (no `userId`) remain in the database but are never returned to clients. They effectively become inaccessible.
- **Cleanup** (optional): To remove orphan data, you can run a one-time migration that deletes all sessions, messages, and projects where `userId` is undefined. This is not required for the app to function.
