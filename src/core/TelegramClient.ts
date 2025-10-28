import type {
    Update,
    GetUpdatesParams,
    SendMessageParams,
    SetMyCommandsParams,
    TelegramResponse,
    File,
    GetFileParams,
    DownloadFileResult,
} from '../types/telegram.js';
import { Logger } from '../utils/Logger.js';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

export class TelegramClient {
    private baseUrl: string;
    private token: string;
    private logger: Logger;

    constructor(token: string) {
        this.token = token;
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

    async getFile(params: GetFileParams): Promise<File> {
        return this.makeRequest<File>('getFile', params);
    }

    async downloadFile(filePath: string, savePath: string): Promise<DownloadFileResult> {
        const fileUrl = `https://api.telegram.org/file/bot${this.token}/${filePath}`;

        try {
            const response = await fetch(fileUrl);

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const dir = path.dirname(savePath);
            await mkdir(dir, { recursive: true });

            await writeFile(savePath, buffer);

            return {
                file_path: savePath,
                file_size: buffer.length,
            };
        } catch (error) {
            this.logger.error(`Failed to download file from ${fileUrl}`, error as Error);
            throw error;
        }
    }

    async downloadFileById(fileId: string, savePath?: string): Promise<DownloadFileResult> {
        const file = await this.getFile({ file_id: fileId });

        if (!file.file_path) {
            throw new Error('File path not available in response');
        }

        // Validate file size (20MB limit)
        const MAX_FILE_SIZE = 20 * 1024 * 1024;
        if (file.file_size && file.file_size > MAX_FILE_SIZE) {
            throw new Error(
                `File size ${file.file_size} exceeds maximum limit of ${MAX_FILE_SIZE} bytes`
            );
        }

        // Generate save path if not provided
        const finalSavePath =
            savePath ||
            path.join(
                tmpdir(),
                `telegram_${fileId}_${Date.now()}_${path.basename(file.file_path)}`
            );

        return this.downloadFile(file.file_path, finalSavePath);
    }
}
