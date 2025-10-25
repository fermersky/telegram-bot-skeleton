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

1. **TelegramClient** - Already tested with 100% coverage
   - Mock fetch using undici MockAgent
   - Test all public methods
   - Test error scenarios

2. **StateManager** - File I/O operations
   - Mock `fs/promises` methods
   - Test load/save/getOffset/setOffset

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
    StateManager.test.ts
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
- **Overall target**: 80% (configured in vitest.config.ts)
- Focus on covering:
  - All public methods
  - Error handling paths
  - Edge cases (empty arrays, null values, etc.)
  - Request/response validation

## Example: TelegramClient Tests (Reference)

See `tests/core/TelegramClient.test.ts` for a complete example of:
- Setting up undici MockAgent
- Testing all public methods
- Testing error scenarios
- Verifying request construction
- Achieving 100% coverage

Key test scenarios covered:
1. Constructor initialization
2. Successful API calls (getMe, getUpdates, sendMessage, setMyCommands)
3. Telegram API errors (ok: false)
4. Network errors (fetch fails)
5. API errors without description
6. Correct headers verification
7. Requests with and without params

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
2. Use undici MockAgent for any fetch calls
3. Mock file system operations (`fs/promises`)
4. Mock timers if needed (`vi.useFakeTimers()`)
5. Don't mock Logger
6. Aim for 80%+ coverage on critical paths
7. Test happy path + error scenarios

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

**Import errors?**
- Use relative imports: `../../src/module.js`
- Include `.js` extension even for TypeScript files
