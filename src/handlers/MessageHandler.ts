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
            `Message from ${message.from?.username || message.from?.id}: ${message.text || message.document?.file_name || (message.photo ? 'photo' : 'unknown')}`
        );

        console.dir({ message }, { depth: Infinity });

        if (this.allowedUserId && message.from?.id !== this.allowedUserId) {
            this.logger.warn(`Ignoring message from unauthorized user: ${message.from?.id}`);
            return;
        }

        if (message.document) {
            await this.handleDocumentMessage(message);
            return;
        }

        if (message.photo) {
            await this.handlePhotoMessage(message);
            return;
        }

        if (message.text?.startsWith('/')) {
            await this.commandHandler.handle(message);
            return;
        }

        await this.handleTextMessage(message);
    }

    private async handlePhotoMessage(message: Message): Promise<void> {
        if (!message.photo || message.photo.length === 0) {
            return;
        }

        // Select largest photo by file_size if available, otherwise by dimensions
        const largestPhoto = message.photo.reduce((largest, current) => {
            if (current.file_size && largest.file_size) {
                return current.file_size > largest.file_size ? current : largest;
            }
            return current.width * current.height > largest.width * largest.height ? current : largest;
        });

        const fileId = largestPhoto.file_id;
        const dimensions = `${largestPhoto.width}x${largestPhoto.height}`;

        this.logger.info(`Downloading photo: ${dimensions} (${largestPhoto.file_size || 'unknown size'} bytes)`);

        try {
            const result = await this.client.downloadFileById(fileId);

            this.logger.info(`Photo saved to: ${result.file_path}`);
        } catch (error) {
            this.logger.error(`Failed to download photo: ${dimensions}`, error as Error);

            await this.client.sendMessage({
                chat_id: message.chat.id,
                text: `❌ Failed to download photo\n`,
            });
        }
    }

    private async handleDocumentMessage(message: Message): Promise<void> {
        if (!message.document) {
            return;
        }

        const fileId = message.document.file_id;
        const fileName = message.document.file_name || 'unknown';
        const fileSize = message.document.file_size;

        this.logger.info(`Downloading document: ${fileName} (${fileSize} bytes)`);

        try {
            const result = await this.client.downloadFileById(fileId);

            this.logger.info(`Document saved to: ${result.file_path}`);
        } catch (error) {
            this.logger.error(`Failed to download document: ${fileName}`, error as Error);

            await this.client.sendMessage({
                chat_id: message.chat.id,
                text: `❌ Failed to download: ${fileName}\n`,
            });
        }
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
