# Implementation Task: Standalone CronService with node-cron

## Context
You are working on a Telegram Bot codebase (`/Users/dan/code/tbot`) built with Node.js and TypeScript. The project follows these architectural patterns:

### Existing Architecture
- **Technology Stack:**
  - TypeScript 5.7.2 (strict mode, ES2022 target)
  - Node.js 24.0.0+
  - ES Modules (`type: "module"`)
  - No third-party Telegram libraries (uses native fetch)

- **Project Structure:**
  ```
  src/
  ├── core/              # Core services (Bot.ts, TelegramClient.ts)
  ├── handlers/          # Event processing
  ├── services/          # Business logic (PollingService.ts, StateManager.ts)
  ├── types/             # TypeScript interfaces (telegram.ts)
  └── utils/             # Cross-cutting concerns (Logger.ts)
  ```

- **Design Patterns:**
  - **Dependency Injection:** Services instantiated in Bot constructor
  - **Lifecycle Management:** Services have `start()` and `stop()` methods
  - **Logging:** Uses custom Logger utility instantiated with context string
  - **Service Pattern:** Example reference - `PollingService.ts` with isRunning flag, error handling with backoff, clean start/stop lifecycle

- **Logger Pattern:**
  ```typescript
  private logger: Logger;
  constructor() {
    this.logger = new Logger('ServiceName');
  }
  ```

## Task Requirements

### 1. Install Dependencies
- Install `node-cron` as production dependency
- Install `@types/node-cron` as dev dependency
- Update package.json

### 2. Create Type Definitions (`src/types/cron.ts`)

Define these TypeScript interfaces:

**CronJobConfig** - Job registration configuration
- `name: string` - Unique job identifier
- `schedule: string` - Cron expression (e.g., "*/5 * * * *")
- `callback: () => Promise<void>` - Async job function
- `timezone?: string` - Optional timezone override
- `enabled?: boolean` - Allow disabling jobs
- `runOnInit?: boolean` - Run immediately on registration

**CronJobStatus** - Runtime job metadata for introspection
- `name: string`
- `schedule: string`
- `isRunning: boolean`
- `lastRun?: Date`
- `nextRun?: Date`
- `executionCount: number`
- `lastError?: Error`

**CronServiceConfig** - Service-level configuration
- `timezone?: string` - Default timezone for all jobs (default: 'Europe/Kiev' or 'Europe/Kyiv')
- `errorHandler?: (jobName: string, error: Error) => void` - Optional error callback

**JobMetadata** - Internal tracking (not exported)
- Track execution count, timestamps, errors

### 3. Create CronService (`src/services/CronService.ts`)

**Requirements:**
- Standalone, reusable service (no dependencies on Bot or handlers)
- Only depends on: node-cron, Logger utility, cron type definitions
- Default timezone: `Europe/Kiev` (or `Europe/Kyiv` - verify which node-cron supports)

**Class Structure:**
```typescript
export class CronService {
    private logger: Logger;
    private jobs: Map<string, ScheduledTask>;        // node-cron tasks
    private jobMetadata: Map<string, JobMetadata>;   // execution tracking
    private isRunning: boolean = false;
    private config: CronServiceConfig;

    constructor(config?: CronServiceConfig)

    // Lifecycle (match PollingService pattern)
    start(): void
    stop(): void

    // Job management
    registerJob(config: CronJobConfig): void
    unregisterJob(name: string): boolean
    pauseJob(name: string): boolean
    resumeJob(name: string): boolean

    // Status introspection
    getJobStatus(name: string): CronJobStatus | undefined
    getAllJobStatuses(): CronJobStatus[]
    isJobRunning(name: string): boolean
}
```

**Implementation Details:**

- **Logger Integration:**
  - Instantiate with `new Logger('CronService')`
  - Log job registration, start, stop, execution, errors

- **Metadata Tracking:**
  - Update execution count on each run
  - Track last execution timestamp
  - Track last error if job fails
  - Calculate next run time

- **Error Handling:**
  - Wrap each job callback in try-catch
  - Log errors without crashing service
  - Call optional errorHandler if configured
  - Store error in metadata
  - Continue running other jobs

- **Lifecycle:**
  - `start()`: Start all enabled jobs, set isRunning = true
  - `stop()`: Stop all running jobs, set isRunning = false
  - Jobs can be registered before or after start()

- **Job Management:**
  - `registerJob()`: Validate config, create node-cron task, store metadata
  - `unregisterJob()`: Stop and remove job
  - `pauseJob()`: Pause specific job (node-cron supports this)
  - `resumeJob()`: Resume paused job

### 4. Design Considerations for Future Integration

**The CronService will eventually be used to send scheduled Telegram messages.** Design with these use cases in mind:

- **Async callback support:** Jobs will call async Telegram API methods
- **Robust error handling:** Network failures shouldn't crash the service
- **Context flexibility:** Callbacks may need access to TelegramClient instance or chat IDs
- **Typical jobs:**
  - Scheduled messages to users/chats
  - Periodic reminders
  - Daily reports or summaries

**Future integration pattern (DO NOT implement now):**
```typescript
// In Bot.ts eventually:
this.cronService = new CronService({ timezone: 'Europe/Kiev' });
this.cronService.registerJob({
    name: 'morning-reminder',
    schedule: '0 9 * * *',  // 9 AM Kyiv time
    callback: async () => {
        await this.client.sendMessage({ chat_id: userId, text: 'Hello!' });
    }
});
this.cronService.start();
```

### 5. Code Style Requirements

- **NO comments or JSDoc** - Clean code only
- **NO README updates** - Documentation comes later
- Match existing code style (check PollingService.ts, StateManager.ts for reference)
- Use strict TypeScript
- Follow existing naming conventions

### 6. What NOT to Do

- ❌ Do NOT integrate with Bot.ts
- ❌ Do NOT modify index.ts
- ❌ Do NOT add .env configuration
- ❌ Do NOT update README.md
- ❌ Do NOT add comments or documentation
- ❌ Do NOT create example usage files

### 7. Deliverables

- ✅ `package.json` updated with dependencies
- ✅ `src/types/cron.ts` with clean type definitions
- ✅ `src/services/CronService.ts` with full implementation
- ✅ All methods working (register, unregister, pause, resume, start, stop, status)
- ✅ Kyiv timezone as default
- ✅ Follows existing architectural patterns
- ✅ Ready for future Telegram bot integration

### 8. node-cron API Reference

Key methods from node-cron:
```typescript
import cron from 'node-cron';

// Create scheduled task
const task = cron.schedule(expression, callback, {
    scheduled: false,  // Don't start immediately
    timezone: 'Europe/Kiev'
});

task.start();      // Start the task
task.stop();       // Stop the task
```

### 9. Timezone Notes

- Use `'Europe/Kiev'` or `'Europe/Kyiv'` (check which node-cron supports)
- This handles EET (UTC+2) / EEST (UTC+3) daylight saving automatically
- Allow per-job timezone override via CronJobConfig

---

## Implementation Instructions

Read the existing `src/services/PollingService.ts` and `src/utils/Logger.ts` to understand the patterns, then implement the three deliverable files following the exact requirements above.
