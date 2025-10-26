# Telegram Bot

A custom Telegram bot built with Node.js 24+, TypeScript, and OOP principles. No third-party Telegram libraries are used - all communication with the Telegram Bot API is handled through custom services using the native fetch API.

## Features

- Custom Telegram API client using native fetch
- Long polling implementation with automatic offset management
- File-based state persistence
- OOP architecture with clean separation of concerns
- PM2 support for production deployment
- TypeScript with strict type checking

## Prerequisites

- Node.js 24 or higher
- pnpm package manager

## Installation

```bash
pnpm install
```

## Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Add your Telegram bot token to `.env`:

```
TELEGRAM_BOT_TOKEN=your_actual_bot_token
ALLOWED_USER_ID=your_telegram_user_id
```

To get a bot token, talk to [@BotFather](https://t.me/botfather) on Telegram.
To get your user ID, use the `/id` command after starting the bot.

## Development

Run the bot in development mode with hot reload:

```bash
pnpm dev
```

## Testing

Run tests:

```bash
pnpm test --run        # Run once
pnpm test              # Watch mode
pnpm test:coverage     # With coverage report
pnpm test:ui           # UI mode
```

### Test Coverage

- **TelegramClient**: 100%
- **StateManager**: 100%
- **Overall target**: 80%

### Testing Stack

- **Vitest** - Test runner and assertions
- **undici MockAgent** - Mocking fetch/HTTP requests
- **vi.mock()** - Mocking file system operations

See `.claude/prompts/testing.md` for detailed testing patterns and examples.

## Production

Build the project:

```bash
pnpm build
```

Run the compiled code:

```bash
pnpm start
```

## PM2 Deployment

Start with PM2:

```bash
pnpm pm2:start
```

Other PM2 commands:

```bash
pnpm pm2:stop      # Stop the bot
pnpm pm2:restart   # Restart the bot
pnpm pm2:logs      # View logs
```

## Project Structure

```
src/
├── core/
│   ├── TelegramClient.ts  # Low-level Telegram API client
│   └── Bot.ts             # Main bot orchestrator
├── handlers/
│   ├── UpdateHandler.ts   # Routes updates to appropriate handlers
│   ├── MessageHandler.ts  # Handles messages
│   └── CommandHandler.ts  # Handles bot commands
├── services/
│   ├── PollingService.ts  # Long polling implementation
│   └── StateManager.ts    # File-based state persistence
├── types/
│   └── telegram.ts        # TypeScript types for Telegram API
├── utils/
│   └── Logger.ts          # Logging utility
└── index.ts               # Entry point

tests/
├── core/
│   └── TelegramClient.test.ts
└── services/
    └── StateManager.test.ts
```

## Default Commands

- `/start` - Initialize conversation with the bot
- `/help` - Show available commands
- `/ping` - Test bot responsiveness
- `/id` - Get your user ID and chat information

## Adding Custom Commands

You can add custom commands by accessing the CommandHandler through the Bot instance:

```typescript
const bot = new Bot(token);
const commandHandler = bot.getCommandHandler();

commandHandler.registerCommand('custom', 'Description of your command', async (message, args) => {
    // Your command logic here
});
```

## Architecture

### TelegramClient

Low-level class that handles HTTP communication with the Telegram Bot API using the native fetch API.

### PollingService

Implements long polling using `getUpdates` with a 30-second timeout and a limit of 100 updates per request. Automatically manages update offsets and persists them to ensure no updates are lost across restarts.

### StateManager

Handles file-based persistence of the bot state (currently just the last processed update offset) in `./data/state.json`.

### Handlers

- **UpdateHandler**: Routes incoming updates to the appropriate handler
- **MessageHandler**: Processes messages and delegates commands
- **CommandHandler**: Manages command registration and execution

### Bot

Main orchestrator that initializes all services and handlers, manages the bot lifecycle.

## State Persistence

The bot automatically saves the last processed update ID to `./data/state.json`. This ensures that when the bot restarts, it continues from where it left off without processing duplicate updates.

## Error Handling

All services include comprehensive error handling and logging. The bot will:

- Log all errors with timestamps and context
- Continue polling even after errors
- Gracefully shut down on SIGINT/SIGTERM signals

## License

MIT
