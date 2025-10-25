import type { Message } from '../types/telegram.js';
import { TelegramClient } from '../core/TelegramClient.js';
import { CommandHandler } from './CommandHandler.js';
import { Logger } from '../utils/Logger.js';

export class MessageHandler {
    private client: TelegramClient;
    private commandHandler: CommandHandler;
    private logger: Logger;
    private allowedUserId: number | null;

    constructor(client: TelegramClient, commandHandler: CommandHandler) {
        this.client = client;
        this.commandHandler = commandHandler;
        this.logger = new Logger('MessageHandler');

        const allowedUserIdStr = process.env.ALLOWED_USER_ID;
        this.allowedUserId = allowedUserIdStr ? parseInt(allowedUserIdStr, 10) : null;

        if (this.allowedUserId) {
            this.logger.info(`Only accepting messages from user ID: ${this.allowedUserId}`);
        } else {
            this.logger.warn('ALLOWED_USER_ID not set - accepting messages from all users');
        }
    }

    async handle(message: Message): Promise<void> {
        this.logger.info(
            `Message from ${message.from?.username || message.from?.id}: ${message.text || message.document?.file_name}`
        );

        if (this.allowedUserId && message.from?.id !== this.allowedUserId) {
            this.logger.warn(`Ignoring message from unauthorized user: ${message.from?.id}`);
            return;
        }

        if (message.text?.startsWith('/')) {
            await this.commandHandler.handle(message);
            return;
        }

        await this.handleTextMessage(message);
    }

    private async handleTextMessage(message: Message): Promise<void> {
        if (!message.text) {
            return;
        }

        await this.client.sendMessage({
            chat_id: message.chat.id,
            text: `You said: ${message.text}`,
        });
    }
}
