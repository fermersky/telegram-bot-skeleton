import { setTimeout } from 'node:timers/promises';
import type { Update } from '../types/telegram.js';
import { TelegramClient } from '../core/TelegramClient.js';
import { StateManager } from './StateManager.js';
import { Logger } from '../utils/Logger.js';

export class PollingService {
    private client: TelegramClient;
    private stateManager: StateManager;
    private logger: Logger;
    private isRunning: boolean;
    private pollTimeout: number;
    private pollLimit: number;

    constructor(client: TelegramClient, stateManager: StateManager) {
        this.client = client;
        this.stateManager = stateManager;
        this.logger = new Logger('PollingService');
        this.isRunning = false;
        this.pollTimeout = 30;
        this.pollLimit = 100;
    }

    async start(onUpdate: (update: Update) => Promise<void>): Promise<void> {
        this.isRunning = true;
        this.logger.info('Polling started');

        while (this.isRunning) {
            try {
                await this.poll(onUpdate);
            } catch (error) {
                this.logger.error('Error during polling', error as Error);
                await setTimeout(5000);
            }
        }
    }

    stop(): void {
        this.isRunning = false;
        this.logger.info('Polling stopped');
    }

    private async poll(onUpdate: (update: Update) => Promise<void>): Promise<void> {
        const offset = this.stateManager.getOffset();

        const updates = await this.client.getUpdates({
            offset,
            timeout: this.pollTimeout,
            limit: this.pollLimit,
        });

        if (updates.length === 0) {
            return;
        }

        this.logger.info(`Received ${updates.length} update(s)`);

        for (const update of updates) {
            try {
                await onUpdate(update);
                await this.stateManager.setOffset(update.update_id + 1);
            } catch (error) {
                this.logger.error(`Failed to process update ${update.update_id}`, error as Error);
            }
        }
    }
}
