# Session plugin

SQLite-backed session plugin for Fastify, using Prisma as the database interface and `@fastify/cookie` for cookie handling.

This plugin gives every request a `request.session` object and adds `fastify.requireAuth()` as a shared authentication helper.

It is built with the following features:
- cookie-based auth
- optional `Authorization: Bearer <token>` support
- server-side session persistence
- session rotation
- simple route-level auth checks
- Prisma + SQLite integration

## What this plugin does

On every request, the plugin:

1. reads the session token from either:
   - the `Authorization` header (`Bearer <token>`)
   - or the session cookie
2. creates `request.session`
3. exposes helpers to:
   - read the current session user
   - require authentication
   - create a session
   - destroy a session
   - rotate a session token

The actual session data lives in the database.

The cookie only stores the bearer token string.

## Files involved

### `plugins/session.plugin.ts`

Main Fastify plugin.

Responsibilities:

- decorates `request.session`
- decorates `fastify.requireAuth`
- loads the current session on each request
- keeps the cookie and Database session in sync
- clears invalid/expired sessions automatically

### `utils/session.ts`

Shared session helpers.

Responsibilities:

- cookie name and TTL constants
- token generation
- token extraction from cookie/header
- cookie option factory
- cookie setter/clearer helpers
- shared `SessionUser` and `SessionRecord` types

## Request API

Every request gets:

```ts
request.session
```

Type:

```ts
type SessionAuth = {
  token: string | null
  user: SessionUser | null
  sessionId: string | null
  get: () => Promise<SessionUser | null>
  require: () => Promise<SessionUser | FastifyReply>
  create: (userId: string, input?: { remember?: boolean }) => Promise<{ token: string }>
  destroy: () => Promise<void>
  rotate: () => Promise<{ token: string } | null>
}
```

## `request.session` fields

### `request.session.token`

Current bearer token extracted from the request.

Possible sources:

- `Authorization: Bearer <token>`
- cookie named `lloka:session`

If neither is present, this is `null`.

### `request.session.user`

Cached authenticated user for the current request.

This starts as `null` and is populated after `await request.session.get()` or `await request.session.require()` succeeds.

### `request.session.sessionId`

Database session id for the current request.

This is only populated once a valid session is loaded from the database.

## `request.session` methods

### `await request.session.get()`

Loads the current session from the database.

Behavior:

- returns `null` if there is no token
- looks up the session by token
- includes the related user
- clears the cookie if the session does not exist
- deletes expired sessions
- updates `lastUsedAt` when valid
- stores the resolved user in `request.session.user`
- stores the Database session id in `request.session.sessionId`

Use this when auth is optional.

Example:

```ts
app.get('/me', async (request, reply) => {
  const user = await request.session?.get()
  if (!user) {
    return sendResponse(reply, 401, { error: 'Unauthorized' })
  }
  return sendResponse(reply, 200, user)
})
```

### `await request.session.require()`

Same as `get()`, but enforces authentication.

Behavior:

- returns the authenticated user when valid
- clears the cookie when invalid
- returns a `401` response through `sendResponse(...)` when unauthorized

Use this when auth is required.

Example:

```ts
app.get('/auth/profile', async (request, reply) => {
  const user = await request.session?.require()
  if (!user || 'statusCode' in user) return user
  return sendResponse(reply, 200, user)
})
```

Important note:

`require()` returns either a `SessionUser` or a `FastifyReply`, not only a user.

That means route handlers must handle both cases.

## `await request.session.create(userId)`

Creates a new Database session for a user and writes the cookie.

Behavior:

- creates a random token
- creates a Database session row
- stores metadata such as `userAgent` and `ipAddress`
- sets the cookie
- updates `request.session.token`
- resets `request.session.user` and `request.session.sessionId`

Use this after register/login.

Example:

```ts
const { token } = await request.session!.create(user.id)
```

The returned `token` is the raw bearer token that was also written into the cookie.

## `await request.session.destroy()`

Deletes the current session by token and clears local session state.

Behavior:

- deletes matching Database sessions
- clears `token`
- clears `user`
- clears `sessionId`
- clears the cookie

Use this for logout.

Example:

```ts
app.post('/auth/logout', async (request, reply) => {
  await request.session?.destroy()
  return sendResponse(reply, 200, { message: 'ok' })
})
```

## `await request.session.rotate()`

Replaces the current session token with a new one while keeping the same Database session row.

Behavior:

- returns `null` if there is no token
- clears session state if the session no longer exists
- generates a new token
- updates the Database session token
- refreshes `expiresAt`
- updates `lastUsedAt`
- rewrites the cookie
- updates `request.session.token`

Use this after sensitive actions such as password change.

Example:

```ts
const rotated = await request.session!.rotate()

if (rotated) {
  await fastify.database.user.update({
    where: { id: user.id },
    data: {
      token: rotated.token,
    },
  })
}
```

## `fastify.requireAuth(request, reply)`

Shared app-level auth helper.

Behavior:

- checks that `request.session` exists
- calls `request.session.require()`
- returns either the authenticated user or the unauthorized response

Example:

```ts
app.get('/private', async (request, reply) => {
  const auth = await app.requireAuth(request, reply)
  if (!auth || 'statusCode' in auth) return auth
  return sendResponse(reply, 200, { userId: auth.id })
})
```

This helper is should be used you want a single shared guard shape across routes (recommended).

## Token sources

The plugin accepts a bearer token from two places:

### 1. Authorization header

```http
Authorization: Bearer session-token
```

### 2. Cookie

Cookie name:

```ts
lloka:session
```

Cookie value format:

```txt
Bearer session-token
```

Header lookup is checked first, then cookie lookup.

That means an explicit `Authorization` header overrides the cookie for the current request.

## Cookie behavior

The session cookie is configured with:

- `path: '/'`
- `httpOnly: true`
- `sameSite: 'lax'`
- `secure: env.NODE_ENV === 'production'`
- `signed: false`
- `maxAge: SESSION_TTL_MS / 1000`

Meaning:

- JavaScript in the browser cannot read it directly because it is `httpOnly`
- it is only marked `secure` in production
- it is available app-wide because the path is `/`

Cookie parsing and cookie reply helpers come from `@fastify/cookie`.

## Session lifetime

Current TTL:

```ts
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
```

This means sessions last 7 days from creation or rotation.

The plugin also extends the session when rotating.

It does **not** currently auto-refresh TTL on every request. It only updates `lastUsedAt` on access.

## Database

This plugin uses the Database via Prisma's `session` model exposed through:

```ts
fastify.database.session
```

It also has a related `user` relation.

The query currently selects this user shape:

```ts
{
  id: true,
  username: true,
  avatar: true,
  token: true,
  email: true
}
```

That means the Prisma `User` model must contain at least:

- `id`
- `username`
- `avatar`
- `token`
- `email`

The `Session` model must contain at least:

- `id`
- `userId`
- `token`
- `userAgent`
- `ipAddress`
- `expiresAt`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

## Expected Prisma schema shape

Minimum schema to keep:

```prisma
model User {
  id        String    @id @default(uuid())
  username  String    @unique
  avatar    String?
  token     String    @unique
  email     String?
  sessions  Session[]
}

model Session {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String   @unique
  userAgent  String?
  ipAddress  String?
  expiresAt  DateTime
  lastUsedAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

Prisma supports SQLite as a database connector, which is what this plugin is designed around.

## Usage patterns

### Public route with optional auth

Use `get()`.

```ts
app.get('/feed', async (request, reply) => {
  const user = await request.session?.get()
  return sendResponse(reply, 200, {
    viewer: user,
  })
})
```

### Protected route

Use `require()`.

```ts
app.get('/auth/profile', async (request, reply) => {
  const user = await request.session?.require()
  if (!user || 'statusCode' in user) return user
  return sendResponse(reply, 200, user)
})
```

### Login

Create a session after validating credentials.

```ts
const { token } = await request.session!.create(user.id)
await fastify.database.user.update({
  where: { id: user.id },
  data: {
    token,
  },
})
```

### Logout

Destroy the active session.

```ts
await request.session?.destroy()
```

### Password change

Rotate the token after changing the password.

```ts
const rotated = await request.session!.rotate()
if (rotated) {
  await fastify.database.user.update({
    where: { id: user.id },
    data: {
      token: rotated.token,
    },
  })
}
```

## Internal flow

### Request start

At `onRequest`:

- extract bearer token
- initialize `request.session`

### When `get()` is called

- no token -> `null`
- token found -> query Database
- no Database session -> clear cookie and return `null`
- expired session -> delete it, clear cookie, return `null`
- valid session -> update `lastUsedAt`, cache user/session id, return user

### When `require()` is called

- delegates to `get()`
- if no user -> sends `401 Unauthorized`

### When `create()` is called

- generate token
- create Database row
- set cookie
- set request-local token state

### When `destroy()` is called

- delete Database session by token
- clear local state
- clear cookie

### When `rotate()` is called

- load current session
- generate new token
- update Database session
- rewrite cookie
- update local state

## Behavior rules

### Invalid token

If the token does not match any Database session:

- cookie is cleared
- local session token is reset
- user resolves to `null`

### Expired token

If the Database session is expired:

- session row is deleted
- cookie is cleared
- local session token is reset
- user resolves to `null`

### Header vs cookie

If both are present:

- authorization header wins

## Recommended route style

Use this pattern consistently:

```ts
const user = await request.session?.require()
if (!user || 'statusCode' in user) return user
```

Or with optional auth:

```ts
const user = await request.session?.get()
```

For login/register:

```ts
const { token } = await request.session!.create(user.id)
```

For logout:

```ts
await request.session?.destroy()
```

For sensitive updates:

```ts
const rotated = await request.session!.rotate()
```

## Environment expectations

This plugin relies on `env.NODE_ENV` for cookie security behavior.

Production:

- `secure: true`

Development:

- `secure: false`