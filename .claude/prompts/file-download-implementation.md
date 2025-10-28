# Implementation Summary: Telegram Bot API File Downloads

## Context

This is a Telegram Bot codebase built with Node.js and TypeScript. The project implements file download functionality using the Telegram Bot API (not MTProto).

### Technology Stack

- TypeScript 5.7.2 (strict mode, ES2022 target)
- Node.js 24.0.0+
- ES Modules (`type: "module"`)
- No third-party Telegram libraries (uses native fetch)
- Async fs/promises for file operations

### Project Structure

```
src/
├── core/              # Core services (Bot.ts, TelegramClient.ts)
├── handlers/          # Event processing (MessageHandler.ts)
├── services/          # Business logic
├── types/             # TypeScript interfaces (telegram.ts)
└── utils/             # Cross-cutting concerns (Logger.ts)
```

## Implementation Overview

### Approach

Implemented Telegram Bot API file downloads using a two-step process:

1. Call `getFile` API endpoint with file_id → returns File object with file_path
2. Download from `https://api.telegram.org/file/bot<token>/<file_path>`

### Constraints

- Maximum file size: 20MB (Bot API limitation)
- File download link valid for at least 1 hour
- Bot API (not MTProto) for simplicity

### Supported Media Types

- **Documents**: Files sent as documents (any file type)
- **Photos**: Images sent as photos (not documents)

## Type Definitions

### File Interface (`src/types/telegram.ts`)

Represents a file ready to be downloaded:

```typescript
export interface File {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
}
```

### GetFileParams Interface

Parameters for getFile API call:

```typescript
export interface GetFileParams {
    file_id: string;
}
```

### DownloadFileResult Interface

Result of download operation:

```typescript
export interface DownloadFileResult {
    file_path: string;
    file_size: number;
}
```

### PhotoSize Interface

Represents one size of a photo:

```typescript
export interface PhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}
```

### Message Interface Updates

Added photo field:

```typescript
export interface Message {
    message_id: number;
    from?: User;
    chat: Chat;
    date: number;
    text?: string;
    photo?: PhotoSize[];        // Added
    document?: Document;
    entities?: MessageEntity[];
}
```

## TelegramClient Implementation

### New Methods (`src/core/TelegramClient.ts`)

#### getFile(params: GetFileParams): Promise<File>

Calls Bot API `getFile` endpoint to get file metadata and download path.

**Returns**: File object with file_path for downloading

#### downloadFile(filePath: string, savePath: string): Promise<DownloadFileResult>

Downloads file from Telegram servers to disk.

**Process**:
1. Construct download URL: `https://api.telegram.org/file/bot{token}/{filePath}`
2. Fetch file using native fetch
3. Convert response to Buffer
4. Create directory if needed (mkdir with recursive: true)
5. Write file to disk (writeFile)

**Returns**: DownloadFileResult with local file_path and file_size

#### downloadFileById(fileId: string, savePath?: string): Promise<DownloadFileResult>

Convenience method combining getFile + downloadFile.

**Process**:
1. Call getFile(file_id) to get file_path
2. Validate file_path exists in response
3. Validate file_size doesn't exceed 20MB
4. Generate save path if not provided (uses tmpdir)
5. Call downloadFile with file_path

**Default save path pattern**:
```
{tmpdir}/telegram_{fileId}_{timestamp}_{basename}
```

**Example**:
```
/var/folders/.../T/telegram_BQACAgIAAxkBAAIBB2k_1761682467823_file_5.docx
```

### Implementation Details

**Imports**:
```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
```

**Token Storage**:
- Added `private token: string` field
- Used for constructing download URL

**Error Handling**:
- Network errors logged and re-thrown
- Missing file_path validation
- 20MB size limit validation (20 * 1024 * 1024 bytes)
- Directory creation failures handled

**File Operations**:
- Uses async fs/promises (mkdir, writeFile)
- mkdir with recursive: true (no error if exists)
- Buffer for binary file handling

## MessageHandler Implementation

### Document Handling (`src/handlers/MessageHandler.ts`)

#### handleDocumentMessage(message: Message): Promise<void>

Processes document uploads:

1. Extract file_id, file_name, file_size from message.document
2. Log download start
3. Call client.downloadFileById(fileId)
4. Log save location on success
5. Send error message to user on failure

**No success confirmation sent to user** (just logged)

### Photo Handling

#### handlePhotoMessage(message: Message): Promise<void>

Processes photo uploads:

1. Validate message.photo array exists and not empty
2. Select largest photo from array
3. Log download start with dimensions
4. Call client.downloadFileById(fileId)
5. Log save location on success
6. Send error message to user on failure

**Photo Selection Logic**:
```typescript
const largestPhoto = message.photo.reduce((largest, current) => {
    if (current.file_size && largest.file_size) {
        return current.file_size > largest.file_size ? current : largest;
    }
    return current.width * current.height > largest.width * largest.height ? current : largest;
});
```

**Priority**:
1. Compare by file_size if both photos have it
2. Fallback to width * height comparison

### Message Routing

Priority order in handle() method:

1. **Document** (`message.document`) → handleDocumentMessage()
2. **Photo** (`message.photo`) → handlePhotoMessage()
3. **Command** (`message.text?.startsWith('/')`) → commandHandler.handle()
4. **Text** → handleTextMessage()

### Logger Updates

Updated log message to include media type:
```typescript
this.logger.info(
    `Message from ${message.from?.username || message.from?.id}: ${
        message.text ||
        message.document?.file_name ||
        (message.photo ? 'photo' : 'unknown')
    }`
);
```

## Key Design Decisions

### Bot API vs MTProto

**Chose Bot API because**:
- Simpler implementation (HTTP/JSON)
- No additional dependencies
- Fits existing TelegramClient pattern
- 20MB limit acceptable for bot use case

**MTProto would provide**:
- No file size limits
- More complex (upload.getFile, InputFileLocation, etc.)
- Requires major refactor

### No FileService Wrapper

**Decision**: Implement methods directly in TelegramClient

**Rationale**:
- Simpler architecture
- Methods logically belong with other Telegram API calls
- No need for separate service abstraction

**Alternative considered**: Separate FileService with retry logic, progress tracking

### Save to Disk (Not Buffer Return)

**Decision**: downloadFile saves to disk, returns file path

**Rationale**:
- Avoids memory issues with large files
- Allows processing after download
- Consistent with temp file pattern

### No Progress Tracking

**Decision**: Downloads happen without progress callbacks

**Rationale**:
- Files limited to 20MB (fast downloads)
- Simplifies implementation
- Can be added later if needed

### Use fs/promises Async Functions

**Decision**: Use async mkdir, writeFile (not sync versions)

**Rationale**:
- Non-blocking I/O
- Matches async nature of fetch
- Better for Node.js event loop

### Temp Directory for Downloads

**Decision**: Use OS temp directory (os.tmpdir) for downloads

**Rationale**:
- Standard location for temporary files
- OS handles cleanup automatically
- No custom cleanup logic needed

**OS Cleanup Behavior**:
- macOS: Cleans `/var/folders/` periodically (typically 3+ days old files)
- Cleanup on system reboot
- May purge when disk space is low
- No guaranteed timing

### No Automatic Cleanup

**Decision**: Rely on OS temp directory cleanup

**Rationale**:
- Simple implementation
- OS handles lifecycle
- Files cleaned eventually

**Future consideration**: Add cleanup service if needed

## Photo Download Details

### PhotoSize Array

When user sends photo as image (not document):
- Telegram provides multiple sizes (thumbnails, medium, large)
- Array typically has 3-4 PhotoSize objects
- Largest size is best quality

### Selection Strategy

1. **Primary**: Compare file_size if available
2. **Fallback**: Compare width * height (area in pixels)

### Why Largest Photo?

- Best quality for archival/processing
- file_size may be undefined for some sizes
- Dimensions always available

## Error Handling

### TelegramClient Level

**getFile errors**:
- Telegram API errors (ok: false)
- Network failures
- Logged and re-thrown

**downloadFile errors**:
- HTTP errors (response.ok check)
- Network failures
- File write failures (mkdir, writeFile)
- Logged and re-thrown

**downloadFileById errors**:
- Missing file_path: `throw new Error('File path not available in response')`
- Size validation: `throw new Error('File size exceeds maximum limit')`
- Propagates errors from getFile and downloadFile

### MessageHandler Level

**Document/Photo errors**:
- Wrapped in try-catch
- Logged with context (file name/dimensions)
- User notified: `❌ Failed to download: {name}`
- Service continues running (no crash)

## Telegram Bot API Reference

### getFile Endpoint

```
POST https://api.telegram.org/bot<token>/getFile
```

**Request**:
```json
{
  "file_id": "DWAAgAD-333"
}
```

**Response**:
```json
{
  "ok": true,
  "result": {
    "file_id": "DWAAgAD-333",
    "file_unique_id": "AQAD-333",
    "file_size": 1024,
    "file_path": "documents/file_5.pdf"
  }
}
```

### File Download URL Pattern

```
https://api.telegram.org/file/bot<token>/<file_path>
```

**Example**:
```
https://api.telegram.org/file/bot123456:ABC-DEF.../documents/file_5.pdf
```

**Valid for**: At least 1 hour (can request new link with getFile)

### PhotoSize Structure

Photos arrive as array of PhotoSize objects:

```json
{
  "photo": [
    {
      "file_id": "AgACAgIAAxkBAAIBa...",
      "file_unique_id": "AQAD...",
      "width": 90,
      "height": 60,
      "file_size": 1234
    },
    {
      "file_id": "AgACAgIAAxkBAAIBb...",
      "file_unique_id": "AQAE...",
      "width": 320,
      "height": 213,
      "file_size": 12345
    },
    {
      "file_id": "AgACAgIAAxkBAAIBc...",
      "file_unique_id": "AQAF...",
      "width": 1280,
      "height": 853,
      "file_size": 123456
    }
  ]
}
```

## Files Modified

### src/types/telegram.ts

**Added**:
- File interface
- GetFileParams interface
- DownloadFileResult interface
- PhotoSize interface

**Modified**:
- Message interface (added photo field)

### src/core/TelegramClient.ts

**Added imports**:
- mkdir, writeFile from 'node:fs/promises'
- path from 'node:path'
- tmpdir from 'node:os'

**Added fields**:
- private token: string

**Added methods**:
- getFile(params: GetFileParams): Promise<File>
- downloadFile(filePath: string, savePath: string): Promise<DownloadFileResult>
- downloadFileById(fileId: string, savePath?: string): Promise<DownloadFileResult>

### src/handlers/MessageHandler.ts

**Added methods**:
- handlePhotoMessage(message: Message): Promise<void>

**Modified methods**:
- handle(message: Message): Added photo routing
- Logger message: Updated to include photo type

**Existing methods**:
- handleDocumentMessage(message: Message): Already existed, uses new download methods

## Testing Recommendations

### Unit Tests (Not Yet Implemented)

**TelegramClient**:
- Mock fetch for getFile
- Mock fetch for downloadFile URL
- Mock fs/promises (mkdir, writeFile)
- Test error scenarios (API errors, network failures, file write errors)
- Test 20MB validation

**MessageHandler**:
- Mock TelegramClient.downloadFileById
- Test document handling
- Test photo handling with various PhotoSize arrays
- Test photo selection logic
- Test error handling and user notifications

### Integration Tests

- Test with real file_id from test bot
- Verify file downloads to temp directory
- Verify file contents match uploaded file
- Test with various file types (PDF, images, documents)

## Future Enhancements

### Automatic Cleanup

Implement cleanup service to manage temp files:

**Options**:
1. Delete file immediately after download (if not needed)
2. Scheduled cleanup (cron job to remove old files)
3. Retention policy (keep files for X hours/days)
4. Custom download directory with quota management

### Additional Media Types

Extend support to:
- Audio files (`message.audio`)
- Video files (`message.video`)
- Voice messages (`message.voice`)
- Video notes (`message.video_note`)
- Stickers (`message.sticker`)

### Progress Tracking

Add callback for large file downloads:

```typescript
interface DownloadProgress {
    bytesDownloaded: number;
    totalBytes: number;
    percentage: number;
}

downloadFileById(
    fileId: string,
    savePath?: string,
    onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadFileResult>
```

### Streaming Downloads

For very large files, use streaming instead of loading entire file into Buffer:

```typescript
const fileStream = fs.createWriteStream(savePath);
const response = await fetch(fileUrl);
await response.body.pipeTo(fileStream);
```

### Custom Download Directory

Add configuration for download location:

```typescript
interface FileDownloadConfig {
    downloadDir?: string;
    createSubdirs?: boolean;
    namingPattern?: (fileId: string, originalName: string) => string;
}
```

### Retry Logic

Add automatic retry for failed downloads:

```typescript
interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
}
```

## Usage Examples

### Download Document

When user sends document:

1. Bot receives Update with message.document
2. MessageHandler routes to handleDocumentMessage()
3. Extracts file_id from document
4. Calls client.downloadFileById(file_id)
5. File saved to: `/var/folders/.../T/telegram_{fileId}_{timestamp}_{filename}`
6. Logs save location

### Download Photo

When user sends photo:

1. Bot receives Update with message.photo array
2. MessageHandler routes to handlePhotoMessage()
3. Selects largest PhotoSize from array
4. Calls client.downloadFileById(file_id)
5. File saved to: `/var/folders/.../T/telegram_{fileId}_{timestamp}_{basename}`
6. Logs save location

### Direct Download (Programmatic)

```typescript
const client = new TelegramClient(token);

// Download by file_id (auto-generates path)
const result = await client.downloadFileById('BQACAgIAAxkBAAIBB2k...');
console.log(result.file_path); // /var/folders/.../T/telegram_...

// Download with custom path
const result = await client.downloadFileById(
    'BQACAgIAAxkBAAIBB2k...',
    '/downloads/myfile.pdf'
);
console.log(result.file_size); // 123456
```

## Known Limitations

1. **20MB file size limit** (Bot API constraint)
2. **No progress tracking** (downloads happen silently)
3. **No automatic cleanup** (relies on OS temp directory cleanup)
4. **No retry logic** (single attempt, manual retry needed)
5. **No file validation** (doesn't verify file integrity)
6. **No duplicate detection** (same file downloaded multiple times creates new temp file each time)

## Implementation Notes

### Why Store Token?

Previously TelegramClient only used `baseUrl` (included token). For file downloads, we need token separately to construct the download URL which has a different pattern:

**API calls**: `https://api.telegram.org/bot{token}/method`
**File downloads**: `https://api.telegram.org/file/bot{token}/{file_path}`

### Temp File Naming

Pattern: `telegram_{fileId}_{timestamp}_{basename}`

**Components**:
- `telegram_` prefix: Easy to identify bot files
- `{fileId}`: Unique Telegram identifier
- `{timestamp}`: Avoids collisions if same file downloaded multiple times
- `{basename}`: Original filename (preserves extension)

**Example**: `telegram_BQACAgIAAxkBAAIBB2k_1761682467823_document.pdf`

### Buffer vs Streaming

Current implementation loads entire file into memory (Buffer) before writing. This is acceptable because:

- Files limited to 20MB
- Node.js handles buffers efficiently
- Simplifies error handling

For larger files (if MTProto used), streaming would be necessary.

### Directory Creation

Uses `mkdir(dir, { recursive: true })`:

- Creates all parent directories if needed
- No error if directory already exists
- Essential for custom save paths

### TypeScript Import Extensions

All imports use `.js` extension even for TypeScript files:

```typescript
import type { File, GetFileParams } from '../types/telegram.js';
```

This is required for ES modules in Node.js.
