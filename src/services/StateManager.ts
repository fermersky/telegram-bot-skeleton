import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import type { BotState } from '../types/telegram.js';
import { Logger } from '../utils/Logger.js';

export class StateManager {
    private statePath: string;
    private state: BotState;
    private logger: Logger;

    constructor(statePath: string = './data/state.json') {
        this.statePath = statePath;
        this.state = { offset: 0 };
        this.logger = new Logger('StateManager');
    }

    async load(): Promise<void> {
        try {
            if (!existsSync(this.statePath)) {
                await this.ensureDirectoryExists();
                await this.save();
                this.logger.info('Created new state file');
                return;
            }

            const data = await readFile(this.statePath, 'utf-8');
            this.state = JSON.parse(data);
            this.logger.info(`Loaded state with offset: ${this.state.offset}`);
        } catch (error) {
            this.logger.error('Failed to load state', error as Error);
            this.state = { offset: 0 };
        }
    }

    async save(): Promise<void> {
        try {
            await this.ensureDirectoryExists();
            await writeFile(this.statePath, JSON.stringify(this.state, null, 2));
        } catch (error) {
            this.logger.error('Failed to save state', error as Error);
        }
    }

    getOffset(): number {
        return this.state.offset;
    }

    async setOffset(offset: number): Promise<void> {
        this.state.offset = offset;
        await this.save();
    }

    private async ensureDirectoryExists(): Promise<void> {
        const dir = dirname(this.statePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
    }
}
