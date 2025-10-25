import { Bot } from './core/Bot.js';
import { Logger } from './utils/Logger.js';

const logger = new Logger('Main');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    process.exit(1);
}

const bot = new Bot(token);

const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...');
    bot.stop();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bot.start().catch((error) => {
    logger.error('Fatal error', error as Error);
    process.exit(1);
});
