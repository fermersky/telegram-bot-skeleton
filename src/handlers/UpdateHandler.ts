import type { Update } from '../types/telegram.js';
import { MessageHandler } from './MessageHandler.js';
import { Logger } from '../utils/Logger.js';

export class UpdateHandler {
    private messageHandler: MessageHandler;
    private logger: Logger;

    constructor(messageHandler: MessageHandler) {
        this.messageHandler = messageHandler;
        this.logger = new Logger('UpdateHandler');
    }

    async handle(update: Update): Promise<void> {
        this.logger.debug(`Processing update ${update.update_id}`);

        if (update.message) {
            await this.messageHandler.handle(update.message);
            return;
        }

        if (update.edited_message) {
            await this.messageHandler.handle(update.edited_message);
            return;
        }

        if (update.channel_post) {
            await this.messageHandler.handle(update.channel_post);
            return;
        }

        if (update.edited_channel_post) {
            await this.messageHandler.handle(update.edited_channel_post);
            return;
        }

        this.logger.warn(`Unhandled update type for update ${update.update_id}`);
    }
}
