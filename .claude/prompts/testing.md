# Testing Guide for Telegram Bot

This project uses **Vitest** with **undici MockAgent** for testing. This document contains everything you need to know about our testing approach and setup.

## Testing Philosophy

- **Focus on core functionality**: Test critical business logic and external dependencies (API calls, file I/O)
- **Not aiming for 100% coverage on everything**: Focus on what matters (handlers, services, core classes)
- **Separate test files**: All tests live in `tests/` folder, mirroring `src/` structure

## Test Setup Summary

### Dependencies Installed

- `vitest` - Test runner
- `@vitest/coverage-v8` - Coverage reporting
- `@vitest/ui` - Optional UI mode
- `undici` - For MockAgent (mocking fetch)

### Configuration Files

**vitest.config.ts**:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/types/**',
                'tests/**',
                'dist/**',
            ],
            all: true,
            lines: 80,
            functions: 80,
            branches: 80,
            statements: 80,
        },
    },
});
```

**package.json scripts**:

```json
{
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
}
```

## Mocking fetch with undici MockAgent

### Why undici MockAgent?

We chose undici MockAgent over other options because:

1. **No production code changes** - Works with existing `fetch` calls
2. **Native to Node.js** - Node 18+ uses undici internally for fetch
3. **Industry standard** - Best practice in 2025
4. **Clean API** - Easy to set up and reason about

### How It Works

Node.js implements global `fetch` using undici internally. MockAgent intercepts at the undici layer, so all `fetch` calls automatically get mocked without any code changes.

### Basic Setup Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { TelegramClient } from '../../src/core/TelegramClient.js';

describe('TelegramClient', () => {
    let client: TelegramClient;
    let mockAgent: MockAgent;
    let originalDispatcher: any;

    beforeEach(() => {
        // Save original dispatcher
        originalDispatcher = getGlobalDispatcher();

        // Create and set up mock agent
        mockAgent = new MockAgent();
        mockAgent.disableNetConnect();
        setGlobalDispatcher(mockAgent);

        // Create instance to test
        client = new TelegramClient('test-token');
    });

    afterEach(async () => {
        // Clean up mock agent
        await mockAgent.close();
        setGlobalDispatcher(originalDispatcher);
    });

    it('should successfully call API', async () => {
        const mockPool = mockAgent.get('https://api.telegram.org');
        mockPool
            .intercept({
                path: '/bottest-token/getMe',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .reply(200, {
                ok: true,
                result: { id: 123, first_name: 'Bot', username: 'bot' },
            });

        const result = await client.getMe();

        expect(result.username).toBe('bot');
    });
});
```

### Mocking Different Scenarios

**Success response**:

```typescript
mockPool
    .intercept({
        path: '/bottoken/method',
        method: 'POST',
    })
    .reply(200, { ok: true, result: { data: 'value' } });
```

**API error (ok: false)**:

```typescript
mockPool
    .intercept({
        path: '/bottoken/method',
        method: 'POST',
    })
    .reply(200, { ok: false, description: 'Error message' });
```

**Network error**:

```typescript
mockPool
    .intercept({
        path: '/bottoken/method',
        method: 'POST',
    })
    .replyWithError(new Error('Network error'));
```

**With request body matching**:

```typescript
const params = { chat_id: 123, text: 'Hello' };

mockPool
    .intercept({
        path: '/bottoken/sendMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })
    .reply(200, { ok: true, result: {} });

await client.sendMessage(params);
```

## Testing Classes with External Dependencies

### DO NOT Mock Logger

Let Logger output naturally during tests. This provides visibility into what's happening and helps debug test failures.

### Classes That Need Mocking

1. **TelegramClient** - ✅ 100% coverage
    - Mock fetch using undici MockAgent
    - Test all public methods
    - Test error scenarios

2. **StateManager** - ✅ 100% coverage
    - Mock `fs/promises` and `fs` modules
    - Test load/save/getOffset/setOffset
    - Test file creation, directory creation, error handling

3. **PollingService** - Long-running process
    - Mock TelegramClient
    - Mock setTimeout
    - Test polling loop and error handling

4. **Handlers** - Message routing and processing
    - Mock TelegramClient
    - Mock dependencies (StateManager, etc.)
    - Test message routing logic

## Test Organization

### Folder Structure

```
tests/
  core/
    Bot.test.ts
    TelegramClient.test.ts ✅ (100% coverage)
  services/
    PollingService.test.ts
    StateManager.test.ts ✅ (100% coverage)
  handlers/
    CommandHandler.test.ts
    MessageHandler.test.ts
    UpdateHandler.test.ts
  utils/
    Logger.test.ts
```

### Naming Convention

- Test files: `*.test.ts`
- Mirror source structure: `src/core/Bot.ts` → `tests/core/Bot.test.ts`
- Import from source: `import { Bot } from '../../src/core/Bot.js'`

## Running Tests

```bash
# Run tests once
pnpm test --run

# Run tests in watch mode
pnpm test

# Run with coverage
pnpm test:coverage --run

# Run with UI
pnpm test:ui
```

## Coverage Expectations

- **TelegramClient**: 100% ✅
- **StateManager**: 100% ✅
- **Overall target**: 80% (configured in vitest.config.ts)
- Focus on covering:
    - All public methods
    - Error handling paths
    - Edge cases (empty arrays, null values, etc.)
    - Request/response validation

## Reference Implementations

### Example: TelegramClient Tests

See `tests/core/TelegramClient.test.ts` for testing HTTP/fetch operations:

- Setting up undici MockAgent
- Testing all public methods
- Testing error scenarios
- Verifying request construction
- Achieving 100% coverage

Key test scenarios covered:

1. Constructor initialization
2. Successful API calls (getMe, getUpdates, sendMessage, setMyCommands, getFile)
3. File download operations (downloadFile, downloadFileById)
4. Telegram API errors (ok: false)
5. Network errors (fetch fails)
6. API errors without description
7. Correct headers verification
8. Requests with and without params
9. File system operations (mkdir, writeFile)
10. File size validation (20MB limit)

### Example: StateManager Tests

See `tests/services/StateManager.test.ts` for testing file I/O operations:

- Mocking fs modules with vi.mock()
- Testing file creation and loading
- Testing error handling (read errors, invalid JSON, write errors)
- Testing directory creation
- Achieving 100% coverage

Key test scenarios covered:

1. Constructor with default/custom paths
2. Creating new state file when it doesn't exist
3. Loading existing state from file
4. Handling file read errors gracefully
5. Handling invalid JSON gracefully
6. Saving state to file
7. Creating directories when needed
8. Handling write errors gracefully
9. Getting and setting offset
10. Integration: complete load-modify-save cycle

## Mocking File System Operations

For classes that use `fs/promises` and `fs`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/services/StateManager.js';

vi.mock('fs/promises');
vi.mock('fs');

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);
const mockExistsSync = vi.mocked(existsSync);

describe('StateManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should load existing state from file', async () => {
        const existingState = { offset: 42 };
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockResolvedValue(JSON.stringify(existingState));

        const manager = new StateManager('./data/state.json');
        await manager.load();

        expect(mockReadFile).toHaveBeenCalledWith('./data/state.json', 'utf-8');
        expect(manager.getOffset()).toBe(42);
    });

    it('should handle file read errors gracefully', async () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFile.mockRejectedValue(new Error('File read error'));

        const manager = new StateManager('./data/state.json');
        await manager.load();

        expect(manager.getOffset()).toBe(0);
    });
});
```

## Testing File Downloads

### Overview

File download testing requires mocking both HTTP requests (for API and file downloads) and file system operations (mkdir, writeFile). The TelegramClient file download tests demonstrate this pattern.

### Setup Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { TelegramClient } from '../../src/core/TelegramClient.js';

vi.mock('node:fs/promises');
vi.mock('node:os');

import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('File Downloads', () => {
    let client: TelegramClient;
    let mockAgent: MockAgent;

    beforeEach(() => {
        mockAgent = new MockAgent();
        mockAgent.disableNetConnect();
        setGlobalDispatcher(mockAgent);

        vi.clearAllMocks();
        vi.mocked(tmpdir).mockReturnValue('/tmp');

        client = new TelegramClient('test-token');
    });

    afterEach(async () => {
        await mockAgent.close();
        setGlobalDispatcher(originalDispatcher);
    });
});
```

### Testing getFile API Call

```typescript
it('should get file information', async () => {
    const mockFile = {
        file_id: 'test-file-id',
        file_unique_id: 'unique-123',
        file_size: 1024,
        file_path: 'documents/file.pdf',
    };

    const mockPool = mockAgent.get('https://api.telegram.org');
    mockPool
        .intercept({
            path: '/bottest-token/getFile',
            method: 'POST',
            body: JSON.stringify({ file_id: 'test-file-id' }),
        })
        .reply(200, {
            ok: true,
            result: mockFile,
        });

    const result = await client.getFile({ file_id: 'test-file-id' });

    expect(result.file_path).toBe('documents/file.pdf');
    expect(result.file_size).toBe(1024);
});
```

### Testing File Download

```typescript
it('should download file to disk', async () => {
    const filePath = 'documents/file.pdf';
    const savePath = '/tmp/test-file.pdf';
    const fileContent = Buffer.from('test file content');

    // Mock file download endpoint
    const mockPool = mockAgent.get('https://api.telegram.org');
    mockPool
        .intercept({
            path: `/file/bottest-token/${filePath}`,
            method: 'GET',
        })
        .reply(200, fileContent);

    // Mock file system operations
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    const result = await client.downloadFile(filePath, savePath);

    expect(result.file_path).toBe(savePath);
    expect(result.file_size).toBe(fileContent.length);
    expect(mkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(savePath, expect.any(Buffer));
});
```

### Testing Combined Operations (downloadFileById)

```typescript
it('should get file info and download', async () => {
    const fileId = 'file-123';
    const mockFile = {
        file_id: fileId,
        file_size: 1024,
        file_path: 'documents/report.pdf',
    };
    const fileContent = Buffer.from('content');

    const mockPool = mockAgent.get('https://api.telegram.org');

    // Mock getFile API call
    mockPool
        .intercept({
            path: '/bottest-token/getFile',
            method: 'POST',
            body: JSON.stringify({ file_id: fileId }),
        })
        .reply(200, { ok: true, result: mockFile });

    // Mock file download
    mockPool
        .intercept({
            path: '/file/bottest-token/documents/report.pdf',
            method: 'GET',
        })
        .reply(200, fileContent);

    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    const result = await client.downloadFileById(fileId);

    expect(result.file_path).toMatch(/\/tmp\/telegram_file-123_\d+_report\.pdf/);
    expect(result.file_size).toBe(fileContent.length);
});
```

### Testing File Size Validation

```typescript
it('should reject files over 20MB', async () => {
    const MAX_SIZE = 20 * 1024 * 1024;
    const mockFile = {
        file_id: 'large-file',
        file_size: MAX_SIZE + 1,
        file_path: 'documents/large.pdf',
    };

    const mockPool = mockAgent.get('https://api.telegram.org');
    mockPool
        .intercept({
            path: '/bottest-token/getFile',
            method: 'POST',
        })
        .reply(200, { ok: true, result: mockFile });

    await expect(client.downloadFileById('large-file')).rejects.toThrow(
        'exceeds maximum limit'
    );
});
```

### Testing Error Scenarios

```typescript
it('should handle HTTP errors', async () => {
    const mockPool = mockAgent.get('https://api.telegram.org');
    mockPool
        .intercept({
            path: '/file/bottest-token/documents/file.pdf',
            method: 'GET',
        })
        .reply(404, 'Not Found');

    await expect(
        client.downloadFile('documents/file.pdf', '/tmp/file.pdf')
    ).rejects.toThrow('Failed to download file');
});

it('should handle file write errors', async () => {
    const fileContent = Buffer.from('test');
    const mockPool = mockAgent.get('https://api.telegram.org');
    mockPool
        .intercept({
            path: '/file/bottest-token/documents/file.pdf',
            method: 'GET',
        })
        .reply(200, fileContent);

    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockRejectedValue(new Error('Write failed'));

    await expect(
        client.downloadFile('documents/file.pdf', '/tmp/file.pdf')
    ).rejects.toThrow('Write failed');
});
```

### Key Patterns for File Download Tests

1. **Mock both API calls**: Use undici MockAgent for both getFile and file download URLs
2. **Mock file system**: Use vi.mock() for fs/promises (mkdir, writeFile) and os (tmpdir)
3. **Binary data**: Use Buffer.from() for file content in mocks
4. **Multiple interceptors**: Chain getFile API → file download URL for combined operations
5. **Verify fs calls**: Assert mkdir and writeFile called with correct parameters
6. **Path validation**: Use regex for auto-generated paths with timestamps
7. **Size limits**: Test edge cases (exactly 20MB, over 20MB, missing size)
8. **Error propagation**: Verify errors from API, network, and fs operations are handled

## Common Testing Patterns

### Testing Async Methods

```typescript
it('should do something async', async () => {
    // Setup mocks
    mockPool.intercept({ ... }).reply(200, { ... });

    // Call async method
    const result = await service.method();

    // Assert
    expect(result).toBe(expectedValue);
});
```

### Testing Error Throwing

```typescript
it('should throw on error', async () => {
    mockPool.intercept({ ... }).reply(200, { ok: false });

    await expect(service.method()).rejects.toThrow('Expected error');
});
```

### Testing Method Calls

```typescript
it('should call dependency method', async () => {
    const mockMethod = vi.fn();
    const service = new Service({ method: mockMethod });

    await service.doSomething();

    expect(mockMethod).toHaveBeenCalledWith(expectedArgs);
});
```

## Alternative Mocking Approaches (Not Used)

We considered but did not use:

1. **MSW (Mock Service Worker)** - Extra dependency, more setup
2. **vi.stubGlobal** - Verbose, global state management
3. **Dependency Injection** - Requires changing production code

## Next Steps for Testing

When adding tests for other components:

1. Create test file in `tests/` matching `src/` structure
2. Use undici MockAgent for any fetch calls (see TelegramClient example)
3. Mock file system operations with vi.mock() (see StateManager example)
4. Mock timers if needed (`vi.useFakeTimers()`)
5. Don't mock Logger
6. Aim for 80%+ coverage on critical paths
7. Test happy path + error scenarios
8. Reference TelegramClient for HTTP/API testing patterns
9. Reference StateManager for file I/O testing patterns

## Troubleshooting

**Tests not found?**

- Check `include` pattern in vitest.config.ts
- Ensure test files end with `.test.ts`

**Fetch not being mocked?**

- Verify MockAgent is set up in beforeEach
- Check URL in `.intercept()` matches exactly
- Verify method and headers match

**Network error message differs?**

- undici wraps errors as "fetch failed"
- Use `.toThrow('fetch failed')` instead of specific error message

**File system mocks not working?**

- Ensure vi.mock() is called BEFORE importing the mocked modules
- Import mocked functions AFTER vi.mock() calls
- Use vi.clearAllMocks() in beforeEach to reset between tests
- For sync functions (existsSync), use mockReturnValue()
- For async functions (readFile, writeFile), use mockResolvedValue() or mockRejectedValue()

**Import errors?**

- Use relative imports: `../../src/module.js`
- Include `.js` extension even for TypeScript files
