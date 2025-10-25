import type {
    Update,
    GetUpdatesParams,
    SendMessageParams,
    SetMyCommandsParams,
    TelegramResponse,
} from '../types/telegram.js';
import { Logger } from '../utils/Logger.js';

export class TelegramClient {
    private baseUrl: string;
    private logger: Logger;

    constructor(token: string) {
        this.baseUrl = `https://api.telegram.org/bot${token}`;
        this.logger = new Logger('TelegramClient');
    }

    private async makeRequest<T>(method: string, params?: object): Promise<T> {
        const url = `${this.baseUrl}/${method}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: params ? JSON.stringify(params) : undefined,
            });

            const data = (await response.json()) as TelegramResponse<T>;

            if (!data.ok) {
                throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
            }

            return data.result;
        } catch (error) {
            this.logger.error(`Failed to call ${method}`, error as Error);
            throw error;
        }
    }

    async getUpdates(params: GetUpdatesParams): Promise<Update[]> {
        return this.makeRequest<Update[]>('getUpdates', params);
    }

    async sendMessage(params: SendMessageParams): Promise<void> {
        await this.makeRequest('sendMessage', params);
    }

    async getMe(): Promise<{ id: number; first_name: string; username: string }> {
        return this.makeRequest('getMe');
    }

    async setMyCommands(params: SetMyCommandsParams): Promise<boolean> {
        return this.makeRequest<boolean>('setMyCommands', params);
    }
}
