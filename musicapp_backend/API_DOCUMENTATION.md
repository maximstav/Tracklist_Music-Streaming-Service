# Music Streaming Platform — REST API Documentation

> **Base URL**: `http://localhost:8080`
> **Content-Type**: `application/json` (all request/response bodies unless noted)
> **Authentication**: JWT Bearer Token (see [Authentication](#1-authentication))

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Songs](#2-songs)
3. [Albums](#3-albums)
4. [Artists](#4-artists)
5. [Playlists](#5-playlists)
6. [Media (S3 Upload/Download)](#6-media-s3-uploaddownload)
7. [Error Handling](#7-error-handling)
8. [CORS Configuration](#8-cors-configuration)

---

## 1. Authentication

Authentication uses **JWT Bearer Tokens**. The `/auth/**` routes are **public** (no token required). All other routes require a valid token.

### Token Lifecycle

| Property       | Value              |
|----------------|--------------------|
| Algorithm      | HS256              |
| Token Lifetime | 24 hours (86400000 ms) |
| Token Location | `Authorization` header |
| Token Format   | `Bearer <token>`   |

### How the Frontend Should Handle Tokens

1. Call `POST /auth/register` or `POST /auth/login` to obtain a `token`.
2. Store the token in memory or `localStorage`.
3. Attach it to **every** subsequent request as a header: `Authorization: Bearer <token>`.
4. If any request returns `401 Unauthorized`, redirect the user to the login page and clear the stored token.

---

### 1.1 Register

Creates a new user account and returns a JWT token.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/auth/register` |
| **Auth Required** | No |

#### Request Body

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

| Field      | Type     | Required | Notes |
|------------|----------|----------|-------|
| `username` | `string` | Yes      | Must be unique |
| `email`    | `string` | Yes      | Must be unique |
| `password` | `string` | Yes      | Stored as bcrypt hash |

#### Responses

**`200 OK`** — Registration successful

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**`400 Bad Request`** — Username or email already exists

```json
{
  "token": "Username or email already exists"
}
```

> [!WARNING]
> On failure, the `token` field contains the error message string, not a JWT. The frontend should check if the HTTP status is `200` before treating `token` as a valid JWT.

#### Example

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'
```

---

### 1.2 Login

Authenticates an existing user and returns a JWT token.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/auth/login` |
| **Auth Required** | No |

#### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

| Field      | Type     | Required | Notes |
|------------|----------|----------|-------|
| `username` | `string` | Yes      | |
| `password` | `string` | Yes      | |
| `email`    | `string` | No       | Ignored for login |

#### Responses

**`200 OK`** — Login successful

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**`401 Unauthorized`** — Bad credentials

```json
{
  "error": "Unauthorized",
  "message": "Bad credentials"
}
```

#### Example

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secret123"}'
```

---

## 2. Songs

**Base Path**: `/api/v1/songs`
**Auth Required**: Yes (all endpoints)

### Schemas

#### SongDto (Response)

```json
{
  "id": 1,
  "title": "string",
  "duration": 240,
  "hasAudio": true,
  "albumId": 1,
  "albumTitle": "string",
  "artistIds": [1, 2],
  "artistNames": ["Artist A", "Artist B"]
}
```

| Field          | Type       | Nullable | Description |
|----------------|------------|----------|-------------|
| `id`           | `number`   | No       | Auto-generated ID |
| `title`        | `string`   | No       | Song title |
| `duration`     | `number`   | No       | Duration in seconds |
| `hasAudio`     | `boolean`  | No       | Whether the song has an uploaded audio file. Use `GET /songs/{id}/play` to get the streaming URL. |
| `albumId`      | `number`   | Yes      | ID of the parent album |
| `albumTitle`   | `string`   | Yes      | Title of the parent album |
| `artistIds`    | `number[]` | No       | List of artist IDs |
| `artistNames`  | `string[]` | No       | List of artist names (same order as `artistIds`) |

#### SongCreateRequest (Request Body)

```json
{
  "title": "string",
  "duration": 240,
  "s3Key": "music/song-name-a1b2c3d4.mp3",
  "albumId": 1,
  "artistIds": [1, 2]
}
```

| Field       | Type       | Required | Validation |
|-------------|------------|----------|------------|
| `title`     | `string`   | Yes      | Cannot be blank |
| `duration`  | `number`   | Yes      | Must be ≥ 1 |
| `s3Key`     | `string`   | No       | Required for `POST /finalize` |
| `albumId`   | `number`   | Yes      | Must reference an existing album |
| `artistIds` | `number[]` | Yes      | At least one valid artist ID |

---

### 2.1 Get All Songs

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/songs` |

#### Response

**`200 OK`** — Returns `SongDto[]`

```json
[
  {
    "id": 1,
    "title": "Bohemian Rhapsody",
    "duration": 354,
    "hasAudio": true,
    "albumId": 1,
    "albumTitle": "A Night at the Opera",
    "artistIds": [1],
    "artistNames": ["Queen"]
  }
]
```

Returns an empty array `[]` if no songs exist.

---

### 2.2 Get Song by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/songs/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Song ID     |

#### Responses

**`200 OK`** — Returns `SongDto`

**`404 Not Found`** — Song not found

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Song not found: 999"
}
```

---

### 2.3 Search Songs

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/songs/search` |

| Query Param | Type     | Required | Description |
|-------------|----------|----------|-------------|
| `title`     | `string` | No*      | Case-insensitive substring match on song title |
| `artist`    | `string` | No*      | Exact match (case-insensitive) on artist name |
| `album`     | `string` | No*      | Case-insensitive substring match on album title |

> [!IMPORTANT]
> At least one of `title`, `artist`, or `album` must be provided. Priority order: if `title` is provided, it is used; otherwise `artist`; otherwise `album`. If none is provided, the endpoint returns `400 Bad Request`.

#### Responses

**`200 OK`** — Returns `SongDto[]` (may be empty)

**`400 Bad Request`** — No query parameter provided

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Provide 'title', 'artist', or 'album' query param."
}
```

#### Examples

```bash
# Search by title
curl http://localhost:8080/api/v1/songs/search?title=bohemian \
  -H "Authorization: Bearer <token>"

# Search by artist
curl http://localhost:8080/api/v1/songs/search?artist=Queen \
  -H "Authorization: Bearer <token>"

# Search by album name
curl http://localhost:8080/api/v1/songs/search?album=opera \
  -H "Authorization: Bearer <token>"
```

---

### 2.4 Play Song (Get Presigned Audio URL)

Returns a temporary presigned S3 URL for streaming the audio file.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/songs/{id}/play` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Song ID     |

#### Response

**`200 OK`**

```json
{
  "playUrl": "https://s3.eu-north-1.amazonaws.com/musicapp-dev-bucket/music/..."
}
```

| Field     | Type     | Description |
|-----------|----------|-------------|
| `playUrl` | `string` | Presigned S3 download URL, valid for 10 minutes |

**`400 Bad Request`** — Song has no audio file (`s3Key` is null/blank)

**`404 Not Found`** — Song not found

> [!TIP]
> The frontend should check `SongDto.hasAudio` before calling this endpoint. Use the returned URL directly as the `src` for an `<audio>` element or pass it to a media library. The URL expires after 10 minutes; request a new one if playback needs to restart after expiry.

---

### 2.5 Create Song

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/songs` |

#### Request Body: `SongCreateRequest`

#### Response

**`201 Created`** — Returns `SongDto`. `Location` header: `/api/v1/songs/{id}`

**`400 Bad Request`** — Validation failure

**`404 Not Found`** — Referenced album or artist(s) not found

---

### 2.6 Finalize Song Upload

Use this after uploading an audio file to S3 via the [Media upload-url endpoint](#61-create-upload-url). This endpoint verifies the S3 object exists before creating the song record.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/songs/finalize` |

#### Request Body: `SongCreateRequest`

> [!IMPORTANT]
> The `s3Key` field is **required** for this endpoint. It must match the `s3Key` returned by `POST /api/v1/media/upload-url`.

#### Response

**`201 Created`** — Returns `SongDto`. `Location` header: `/api/v1/songs/{id}`

**`400 Bad Request`** — `s3Key` missing, or S3 object not found at the given key

**`500 Internal Server Error`** — Failed to verify S3 object

> [!NOTE]
> The backend retries S3 existence checks up to 6 times (500ms apart) to handle eventual consistency.

---

### 2.7 Update Song

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **URL** | `/api/v1/songs/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Song ID     |

#### Request Body: `SongCreateRequest`

#### Response

**`200 OK`** — Returns updated `SongDto`

**`400 Bad Request`** — Validation failure

**`404 Not Found`** — Song, album, or artist(s) not found

---

### 2.8 Delete Song

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **URL** | `/api/v1/songs/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Song ID     |

#### Response

**`204 No Content`** — Deleted successfully (empty body)

**`404 Not Found`** — Song not found

---

## 3. Albums

**Base Path**: `/api/v1/albums`
**Auth Required**: Yes (all endpoints)

### Schemas

#### AlbumDto (Response)

```json
{
  "id": 1,
  "title": "string",
  "releaseYear": 2023,
  "artistId": 1,
  "artistName": "string",
  "hasCoverArt": true,
  "songIds": [1, 2, 3]
}
```

| Field           | Type       | Nullable | Description |
|-----------------|------------|----------|-------------|
| `id`            | `number`   | No       | Auto-generated ID |
| `title`         | `string`   | No       | Album title |
| `releaseYear`   | `number`   | No       | Year of release |
| `artistId`      | `number`   | Yes      | ID of the album's primary artist |
| `artistName`    | `string`   | Yes      | Name of the album's primary artist |
| `hasCoverArt`   | `boolean`  | No       | Whether the album has cover art. Use `GET /albums/{id}/cover` to get the image URL. |
| `songIds`       | `number[]` | No       | IDs of songs in this album |

#### AlbumCreateRequest (Request Body)

```json
{
  "title": "string",
  "releaseYear": 2023,
  "artistId": 1,
  "coverArtS3Key": "covers/album-cover-a1b2c3d4.jpg"
}
```

| Field           | Type     | Required | Validation |
|-----------------|----------|----------|------------|
| `title`         | `string` | Yes      | Cannot be blank |
| `releaseYear`   | `number` | Yes      | Must be > 0 |
| `artistId`      | `number` | Yes      | Must reference an existing artist |
| `coverArtS3Key` | `string` | No       | S3 key from media upload |

---

### 3.1 Get All Albums

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/albums` |

#### Response

**`200 OK`** — Returns `AlbumDto[]`

---

### 3.2 Get Album by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/albums/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Album ID    |

#### Responses

**`200 OK`** — Returns `AlbumDto`

**`404 Not Found`** — Album not found

---

### 3.3 Finalize Album Creation

Use this after uploading cover art to S3 via the [Media upload-url endpoint](#61-create-upload-url).

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/albums/finalize` |

#### Request Body: `AlbumCreateRequest`

If `coverArtS3Key` is provided and non-blank, the backend verifies the S3 object exists before creating the album.

#### Response

**`201 Created`** — Returns `AlbumDto`. `Location` header: `/api/v1/albums/{id}`

**`400 Bad Request`** — Validation failure or S3 object not found for cover art

**`404 Not Found`** — Referenced artist not found

#### Example

```bash
curl -X POST http://localhost:8080/api/v1/albums/finalize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Album","releaseYear":2024,"artistId":1,"coverArtS3Key":"covers/my-album-a1b2c3d4.jpg"}'
```

---

### 3.4 Get Album Cover Art (Presigned Image URL)

Returns a temporary presigned S3 URL for displaying the album's cover art.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/albums/{id}/cover` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Album ID    |

#### Response

**`200 OK`**

```json
{
  "coverUrl": "https://s3.eu-north-1.amazonaws.com/musicapp-dev-bucket/covers/..."
}
```

| Field      | Type     | Description |
|------------|----------|-------------|
| `coverUrl` | `string` | Presigned S3 download URL for the cover image, valid for 10 minutes |

**`400 Bad Request`** — Album has no cover art

**`404 Not Found`** — Album not found

> [!TIP]
> The frontend should check `AlbumDto.hasCoverArt` before calling this endpoint. Use the returned URL directly as the `src` for an `<img>` element.

---

### 3.5 Update Album

| Property | Value |
|----------|-------|
| **Method** | `PUT` |
| **URL** | `/api/v1/albums/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Album ID    |

#### Request Body: `AlbumCreateRequest`

#### Response

**`200 OK`** — Returns updated `AlbumDto`

**`400 Bad Request`** — Validation failure

**`404 Not Found`** — Album or artist not found

> [!NOTE]
> Setting `coverArtS3Key` to `null` in the request body will remove the cover art reference. This does not delete the file from S3.

---

### 3.6 Delete Album

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **URL** | `/api/v1/albums/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Album ID    |

#### Responses

**`204 No Content`** — Deleted successfully

**`400 Bad Request`** — Album has associated songs and cannot be deleted

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Cannot delete album: 1 because it is associated with 5 song(s)."
}
```

**`404 Not Found`** — Album not found

> [!CAUTION]
> An album cannot be deleted if it has songs. Delete or reassign all songs first.

---

## 4. Artists

**Base Path**: `/api/v1/artists`
**Auth Required**: Yes (all endpoints)

### Schemas

#### ArtistDto (Response)

```json
{
  "id": 1,
  "name": "string",
  "genre": "string",
  "songIds": [1, 2],
  "songTitles": ["Song A", "Song B"],
  "albumIds": [1],
  "albumTitles": ["Album A"]
}
```

| Field         | Type       | Nullable | Description |
|---------------|------------|----------|-------------|
| `id`          | `number`   | No       | Auto-generated ID |
| `name`        | `string`   | No       | Artist name |
| `genre`       | `string`   | Yes      | Genre (optional) |
| `songIds`     | `number[]` | No       | IDs of songs by this artist |
| `songTitles`  | `string[]` | No       | Titles of songs (same order as `songIds`) |
| `albumIds`    | `number[]` | No       | IDs of albums by this artist |
| `albumTitles` | `string[]` | No       | Titles of albums (same order as `albumIds`) |

#### ArtistCreateRequest (Request Body)

```json
{
  "name": "string",
  "genre": "string"
}
```

| Field   | Type     | Required | Validation |
|---------|----------|----------|------------|
| `name`  | `string` | Yes      | Cannot be blank |
| `genre` | `string` | No       | Optional |

---

### 4.1 Get All Artists

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/artists` |

#### Response

**`200 OK`** — Returns `ArtistDto[]`

---

### 4.2 Get Artist by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/artists/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Artist ID   |

#### Responses

**`200 OK`** — Returns `ArtistDto`

**`404 Not Found`** — Artist not found

---

### 4.3 Create Artist

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/artists` |

#### Request Body: `ArtistCreateRequest`

#### Response

**`201 Created`** — Returns `ArtistDto`. `Location` header: `/api/v1/artists/{id}`

**`400 Bad Request`** — Validation failure

#### Example

```bash
curl -X POST http://localhost:8080/api/v1/artists \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Queen","genre":"Rock"}'
```

---

## 5. Playlists

**Base Path**: `/api/v1/playlists`
**Auth Required**: Yes (all endpoints)

### Schemas

#### PlaylistDto (Response)

```json
{
  "id": 1,
  "name": "string",
  "userId": 1,
  "songIds": [1, 2, 3]
}
```

| Field     | Type       | Nullable | Description |
|-----------|------------|----------|-------------|
| `id`      | `number`   | No       | Auto-generated ID |
| `name`    | `string`   | No       | Playlist name |
| `userId`  | `number`   | Yes      | ID of the owning user |
| `songIds` | `number[]` (Set) | No | IDs of songs in the playlist (unordered) |

#### PlaylistCreateRequest (Request Body)

```json
{
  "name": "string",
  "userId": 1
}
```

| Field    | Type     | Required | Validation |
|----------|----------|----------|------------|
| `name`   | `string` | Yes      | Cannot be blank |
| `userId` | `number` | No       | Ignored when creating via authenticated endpoint (user derived from JWT) |

---

### 5.1 Get Playlist by ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/playlists/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Playlist ID |

#### Responses

**`200 OK`** — Returns `PlaylistDto`

**`404 Not Found`** — Playlist not found

---

### 5.2 Get My Playlists (Current User)

Returns all playlists belonging to the currently authenticated user (derived from JWT token).

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/playlists/my` |

#### Response

**`200 OK`** — Returns `PlaylistDto[]`

Returns `[]` if the user has no playlists.

> [!TIP]
> This is the **preferred** endpoint for fetching the logged-in user's library. No user ID needs to be known by the frontend.

#### Example

```bash
curl http://localhost:8080/api/v1/playlists/my \
  -H "Authorization: Bearer <token>"
```

---

### 5.3 Get Playlists by User ID

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/playlists/user/{userId}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `userId`   | `number` | User ID     |

#### Response

**`200 OK`** — Returns `PlaylistDto[]`

> [!NOTE]
> Prefer `GET /api/v1/playlists/my` for the current user. This endpoint is available but intended for admin-like use cases.

---

### 5.4 Create Playlist

Creates a playlist for the **authenticated user** (user is derived from the JWT token, not from the request body).

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/playlists` |

#### Request Body

```json
{
  "name": "My Playlist"
}
```

| Field  | Type     | Required | Notes |
|--------|----------|----------|-------|
| `name` | `string` | Yes      | Cannot be blank |

> [!IMPORTANT]
> The `userId` field in the request body is **ignored**. The playlist owner is always the authenticated user from the JWT token.

#### Response

**`201 Created`** — Returns `PlaylistDto`. `Location` header: `/api/v1/playlists/{id}`

**`400 Bad Request`** — Name is blank or missing

#### Example

```bash
curl -X POST http://localhost:8080/api/v1/playlists \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Chill Vibes"}'
```

---

### 5.5 Delete Playlist

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **URL** | `/api/v1/playlists/{id}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Playlist ID |

#### Response

**`204 No Content`** — Deleted successfully

**`404 Not Found`** — Playlist not found

---

### 5.6 Add Song to Playlist

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/playlists/{id}/songs/{songId}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Playlist ID |
| `songId`   | `number` | Song ID     |

**No request body required.**

#### Response

**`200 OK`** — Returns updated `PlaylistDto` (with the new song in `songIds`)

**`404 Not Found`** — Playlist or song not found

#### Example

```bash
curl -X POST http://localhost:8080/api/v1/playlists/1/songs/5 \
  -H "Authorization: Bearer <token>"
```

---

### 5.7 Remove Song from Playlist

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **URL** | `/api/v1/playlists/{id}/songs/{songId}` |

| Path Param | Type     | Description |
|------------|----------|-------------|
| `id`       | `number` | Playlist ID |
| `songId`   | `number` | Song ID     |

#### Response

**`200 OK`** — Returns updated `PlaylistDto` (with the song removed from `songIds`)

**`404 Not Found`** — Playlist or song not found

---

## 6. Media (S3 Upload/Download)

**Base Path**: `/api/v1/media`
**Auth Required**: Yes (all endpoints)

These endpoints handle file uploads (audio, cover art) to AWS S3 via **presigned URLs**. The frontend never uploads directly to the backend server; instead it:

1. Requests a presigned upload URL from the backend.
2. Uploads the file directly to S3 using the presigned URL (HTTP `PUT`).
3. Calls a finalize endpoint (e.g., `POST /api/v1/songs/finalize`) with the `s3Key`.

### Upload Flow Diagram

```
Frontend                    Backend                     AWS S3
   |                           |                           |
   |-- POST /media/upload-url ->|                          |
   |<- {s3Key, uploadUrl} -----|                           |
   |                           |                           |
   |-- PUT uploadUrl (file) ---|-------------------------->|
   |<- 200 OK -----------------|<--------------------------|
   |                           |                           |
   |-- POST /songs/finalize -->|                           |
   |   {title, s3Key, ...}     |-- HEAD s3Key ------------>|
   |                           |<- 200 OK ------------------|
   |<- 201 Created ------------|                           |
```

---

### 6.1 Create Upload URL

Generates a presigned S3 upload URL and a unique S3 key.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/media/upload-url` |

#### Request Body

```json
{
  "filename": "my-song.mp3",
  "contentType": "audio/mpeg",
  "prefix": "music"
}
```

| Field         | Type     | Required | Default  | Description |
|---------------|----------|----------|----------|-------------|
| `filename`    | `string` | Yes      | —        | Original filename (used to derive S3 key) |
| `contentType` | `string` | Yes      | —        | MIME type (e.g., `audio/mpeg`, `image/jpeg`) |
| `prefix`      | `string` | No       | `"music"` | S3 folder prefix (e.g., `music`, `covers`) |

#### Response

**`200 OK`**

```json
{
  "s3Key": "music/my-song-a1b2c3d4.mp3",
  "uploadUrl": "https://s3.eu-north-1.amazonaws.com/musicapp-dev-bucket/music/my-song-a1b2c3d4.mp3?X-Amz-Algorithm=..."
}
```

| Field       | Type     | Description |
|-------------|----------|-------------|
| `s3Key`     | `string` | Unique S3 object key (store this for finalization) |
| `uploadUrl` | `string` | Presigned PUT URL, valid for 10 minutes |

> [!IMPORTANT]
> **How to upload to S3**: Make an HTTP `PUT` request to the `uploadUrl` with:
> - The file as the raw request body
> - `Content-Type` header matching the `contentType` sent in the request
>
> ```bash
> curl -X PUT "<uploadUrl>" \
>   -H "Content-Type: audio/mpeg" \
>   --data-binary @my-song.mp3
> ```

#### S3 Key Generation Rules

- Format: `{prefix}/{sanitized-filename}-{8-char-uuid}.{extension}`
- Filename is sanitized: lowercased, special characters replaced with hyphens, max 50 characters
- A random 8-character UUID suffix ensures uniqueness

---

### 6.2 Create Download URL

Generates a presigned S3 download URL for any file.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/media/download-url?key={s3Key}` |

| Query Param | Type     | Required | Description |
|-------------|----------|----------|-------------|
| `key`       | `string` | Yes      | Full S3 object key (e.g., `covers/my-album-abc123.jpg`) |

> [!NOTE]
> The `key` is passed as a query parameter, so S3 keys with slashes (e.g., `covers/image.jpg`) work correctly. For song audio playback, prefer using `GET /api/v1/songs/{id}/play` instead.

#### Response

**`200 OK`**

```json
{
  "key": "some-key",
  "url": "https://s3.eu-north-1.amazonaws.com/..."
}
```

| Field | Type     | Description |
|-------|----------|-------------|
| `key` | `string` | Echo of the requested key |
| `url` | `string` | Presigned GET URL, valid for 10 minutes |

---

## 7. Error Handling

The API uses **RFC 7807 Problem Detail** format for error responses (via Spring's `ProblemDetail`).

### Standard Error Response Shape

```json
{
  "type": "about:blank",
  "title": "string",
  "status": 400,
  "detail": "string",
  "instance": "string"
}
```

| Field      | Type     | Description |
|------------|----------|-------------|
| `type`     | `string` | Error type URI (always `about:blank`) |
| `title`    | `string` | Short error title (e.g., `"Not Found"`, `"Bad Request"`) |
| `status`   | `number` | HTTP status code |
| `detail`   | `string` | Human-readable error message |
| `instance` | `string` | Request path (optional) |

### Error Status Codes Summary

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| `400`  | Bad Request | Validation failure, missing required field, blank values, referenced entity not found in constraints |
| `401`  | Unauthorized | Missing/invalid/expired JWT token |
| `404`  | Not Found | Entity with given ID does not exist |
| `500`  | Internal Server Error | Unexpected server error, S3 connectivity issues |

### 401 Unauthorized Response (JWT Entry Point)

When a request lacks or has an invalid token, the response format is different:

```json
{
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

### Validation Errors (MethodArgumentNotValidException)

```json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 400,
  "errors": {
    "fieldName": "error message",
    "otherField": "other error message"
  }
}
```

### Validation Rules Quick Reference

| Resource | Field | Rule |
|----------|-------|------|
| Song | `title` | Required, non-blank |
| Song | `duration` | Required, ≥ 1 |
| Song | `albumId` | Required, must exist |
| Song | `artistIds` | Required, non-empty, at least one must exist |
| Song (finalize) | `s3Key` | Required, must exist in S3 |
| Album | `title` | Required, non-blank |
| Album | `releaseYear` | Required, > 0 |
| Album | `artistId` | Required, must exist |
| Album (delete) | — | Cannot delete if songs exist |
| Artist | `name` | Required, non-blank |
| Artist (delete) | — | Cannot delete if albums or songs exist |
| Playlist | `name` | Required, non-blank |
| Auth (register) | `username` | Required, must be unique |
| Auth (register) | `email` | Required, must be unique |

---

## 8. CORS Configuration

| Property | Value |
|----------|-------|
| **Allowed Origins** | `http://localhost:3000`, `http://localhost:5173` |
| **Allowed Methods** | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS` |
| **Allowed Headers** | `*` (all) |
| **Exposed Headers** | `Authorization` |
| **Credentials** | Allowed (`allowCredentials: true`) |
| **Applies To** | `/api/v1/**`, `/auth/**` |

---

## Appendix: Complete Endpoint Reference

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/auth/register` | No | Register new user |
| `POST` | `/auth/login` | No | Log in existing user |
| `GET` | `/api/v1/songs` | Yes | List all songs |
| `GET` | `/api/v1/songs/{id}` | Yes | Get song by ID |
| `GET` | `/api/v1/songs/search?title=&artist=` | Yes | Search songs |
| `GET` | `/api/v1/songs/{id}/play` | Yes | Get presigned audio URL |
| `POST` | `/api/v1/songs` | Yes | Create song |
| `POST` | `/api/v1/songs/finalize` | Yes | Finalize song upload |
| `PUT` | `/api/v1/songs/{id}` | Yes | Update song |
| `DELETE` | `/api/v1/songs/{id}` | Yes | Delete song |
| `GET` | `/api/v1/albums` | Yes | List all albums |
| `GET` | `/api/v1/albums/{id}` | Yes | Get album by ID |
| `GET` | `/api/v1/albums/{id}/cover` | Yes | Get presigned cover art URL |
| `POST` | `/api/v1/albums/finalize` | Yes | Finalize album creation |
| `PUT` | `/api/v1/albums/{id}` | Yes | Update album |
| `DELETE` | `/api/v1/albums/{id}` | Yes | Delete album |
| `GET` | `/api/v1/artists` | Yes | List all artists |
| `GET` | `/api/v1/artists/{id}` | Yes | Get artist by ID |
| `POST` | `/api/v1/artists` | Yes | Create artist |
| `GET` | `/api/v1/playlists/{id}` | Yes | Get playlist by ID |
| `GET` | `/api/v1/playlists/my` | Yes | Get current user's playlists |
| `GET` | `/api/v1/playlists/user/{userId}` | Yes | Get playlists by user ID |
| `POST` | `/api/v1/playlists` | Yes | Create playlist |
| `DELETE` | `/api/v1/playlists/{id}` | Yes | Delete playlist |
| `POST` | `/api/v1/playlists/{id}/songs/{songId}` | Yes | Add song to playlist |
| `DELETE` | `/api/v1/playlists/{id}/songs/{songId}` | Yes | Remove song from playlist |
| `POST` | `/api/v1/media/upload-url` | Yes | Get presigned upload URL |
| `GET` | `/api/v1/media/download-url?key=` | Yes | Get presigned download URL |
