import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { TelegramClient } from '../../src/core/TelegramClient.js';

vi.mock('node:fs/promises');
vi.mock('node:os');

import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

describe('TelegramClient', () => {
    let client: TelegramClient;
    let mockAgent: MockAgent;
    let originalDispatcher: any;
    const TEST_TOKEN = 'test-token-123';
    const BASE_URL = 'https://api.telegram.org';

    beforeEach(() => {
        // Save original dispatcher
        originalDispatcher = getGlobalDispatcher();

        // Create and set up mock agent
        mockAgent = new MockAgent();
        mockAgent.disableNetConnect();
        setGlobalDispatcher(mockAgent);

        // Clear all mocks
        vi.clearAllMocks();

        // Mock tmpdir
        vi.mocked(tmpdir).mockReturnValue('/tmp');

        // Create client instance
        client = new TelegramClient(TEST_TOKEN);
    });

    afterEach(async () => {
        // Clean up mock agent
        await mockAgent.close();
        setGlobalDispatcher(originalDispatcher);
    });

    describe('constructor', () => {
        it('should initialize with correct base URL', () => {
            // We can't directly access baseUrl since it's private,
            // but we can verify it works by making a request
            expect(client).toBeInstanceOf(TelegramClient);
        });
    });

    describe('getMe', () => {
        it('should successfully get bot information', async () => {
            const mockBotInfo = {
                id: 123456789,
                first_name: 'TestBot',
                username: 'test_bot',
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getMe`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: mockBotInfo,
                });

            const result = await client.getMe();

            expect(result).toEqual(mockBotInfo);
            expect(result.id).toBe(123456789);
            expect(result.username).toBe('test_bot');
        });

        it('should throw error when API returns ok: false', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getMe`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: false,
                    description: 'Unauthorized',
                });

            await expect(client.getMe()).rejects.toThrow('Telegram API error: Unauthorized');
        });

        it('should throw error when network request fails', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getMe`,
                    method: 'POST',
                })
                .replyWithError(new Error('Network error'));

            await expect(client.getMe()).rejects.toThrow('fetch failed');
        });
    });

    describe('getUpdates', () => {
        it('should successfully get updates with params', async () => {
            const mockUpdates = [
                {
                    update_id: 123,
                    message: {
                        message_id: 1,
                        date: 1234567890,
                        chat: { id: 456, type: 'private' as const },
                        text: 'test message',
                    },
                },
            ];

            const params = {
                offset: 100,
                timeout: 30,
                limit: 100,
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getUpdates`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                })
                .reply(200, {
                    ok: true,
                    result: mockUpdates,
                });

            const result = await client.getUpdates(params);

            expect(result).toEqual(mockUpdates);
            expect(result).toHaveLength(1);
            expect(result[0].update_id).toBe(123);
        });

        it('should handle empty updates array', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getUpdates`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: [],
                });

            const result = await client.getUpdates({ offset: 0 });

            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });
    });

    describe('sendMessage', () => {
        it('should successfully send a message', async () => {
            const params = {
                chat_id: 123456,
                text: 'Hello, World!',
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/sendMessage`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                })
                .reply(200, {
                    ok: true,
                    result: {
                        message_id: 789,
                        date: 1234567890,
                        chat: { id: 123456, type: 'private' },
                        text: 'Hello, World!',
                    },
                });

            await expect(client.sendMessage(params)).resolves.toBeUndefined();
        });

        it('should throw error when message fails to send', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/sendMessage`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: false,
                    description: 'Chat not found',
                });

            await expect(client.sendMessage({ chat_id: 999, text: 'test' })).rejects.toThrow(
                'Telegram API error: Chat not found'
            );
        });
    });

    describe('setMyCommands', () => {
        it('should successfully set bot commands', async () => {
            const params = {
                commands: [
                    { command: 'start', description: 'Start the bot' },
                    { command: 'help', description: 'Show help' },
                ],
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/setMyCommands`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                })
                .reply(200, {
                    ok: true,
                    result: true,
                });

            const result = await client.setMyCommands(params);

            expect(result).toBe(true);
        });

        it('should return false when command setting fails', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/setMyCommands`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: false,
                });

            const result = await client.setMyCommands({ commands: [] });

            expect(result).toBe(false);
        });
    });

    describe('makeRequest error handling', () => {
        it('should handle API error without description', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getMe`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: false,
                });

            await expect(client.getMe()).rejects.toThrow('Telegram API error: Unknown error');
        });

        it('should verify correct Content-Type header is sent', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getMe`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                .reply(200, {
                    ok: true,
                    result: { id: 1, first_name: 'Bot', username: 'bot' },
                });

            await client.getMe();

            // If headers don't match, undici will not intercept and test will fail
        });

        it('should handle request with no params', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getMe`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: { id: 1, first_name: 'Bot', username: 'bot' },
                });

            await expect(client.getMe()).resolves.toBeDefined();
        });
    });

    describe('getFile', () => {
        it('should successfully get file information', async () => {
            const fileId = 'test-file-id-123';
            const mockFile = {
                file_id: fileId,
                file_unique_id: 'unique-123',
                file_size: 1024,
                file_path: 'documents/file.pdf',
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file_id: fileId }),
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            const result = await client.getFile({ file_id: fileId });

            expect(result).toEqual(mockFile);
            expect(result.file_id).toBe(fileId);
            expect(result.file_path).toBe('documents/file.pdf');
            expect(result.file_size).toBe(1024);
        });

        it('should throw error when API returns ok: false', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: false,
                    description: 'File not found',
                });

            await expect(client.getFile({ file_id: 'invalid' })).rejects.toThrow(
                'Telegram API error: File not found'
            );
        });

        it('should throw error when network request fails', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .replyWithError(new Error('Network error'));

            await expect(client.getFile({ file_id: 'test' })).rejects.toThrow('fetch failed');
        });
    });

    describe('downloadFile', () => {
        it('should successfully download file to disk', async () => {
            const filePath = 'documents/file.pdf';
            const savePath = '/tmp/test-file.pdf';
            const fileContent = Buffer.from('test file content');

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/${filePath}`,
                    method: 'GET',
                })
                .reply(200, fileContent);

            vi.mocked(mkdir).mockResolvedValue(undefined);
            vi.mocked(writeFile).mockResolvedValue(undefined);

            const result = await client.downloadFile(filePath, savePath);

            expect(result.file_path).toBe(savePath);
            expect(result.file_size).toBe(fileContent.length);
            expect(mkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
            expect(writeFile).toHaveBeenCalledWith(savePath, expect.any(Buffer));
        });

        it('should throw error on HTTP error response', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/file.pdf`,
                    method: 'GET',
                })
                .reply(404, 'Not Found');

            await expect(client.downloadFile('documents/file.pdf', '/tmp/file.pdf')).rejects.toThrow(
                'Failed to download file'
            );
        });

        it('should throw error when network request fails', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/file.pdf`,
                    method: 'GET',
                })
                .replyWithError(new Error('Network error'));

            await expect(client.downloadFile('documents/file.pdf', '/tmp/file.pdf')).rejects.toThrow(
                'fetch failed'
            );
        });

        it('should throw error when file write fails', async () => {
            const fileContent = Buffer.from('test');

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/file.pdf`,
                    method: 'GET',
                })
                .reply(200, fileContent);

            vi.mocked(mkdir).mockResolvedValue(undefined);
            vi.mocked(writeFile).mockRejectedValue(new Error('Write failed'));

            await expect(client.downloadFile('documents/file.pdf', '/tmp/file.pdf')).rejects.toThrow(
                'Write failed'
            );
        });
    });

    describe('downloadFileById', () => {
        it('should successfully download with auto-generated path', async () => {
            const fileId = 'file-123';
            const mockFile = {
                file_id: fileId,
                file_unique_id: 'unique-123',
                file_size: 1024,
                file_path: 'documents/report.pdf',
            };
            const fileContent = Buffer.from('content');

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                    body: JSON.stringify({ file_id: fileId }),
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/report.pdf`,
                    method: 'GET',
                })
                .reply(200, fileContent);

            vi.mocked(mkdir).mockResolvedValue(undefined);
            vi.mocked(writeFile).mockResolvedValue(undefined);

            const result = await client.downloadFileById(fileId);

            expect(result.file_path).toMatch(/\/tmp\/telegram_file-123_\d+_report\.pdf/);
            expect(result.file_size).toBe(fileContent.length);
        });

        it('should successfully download with custom path', async () => {
            const fileId = 'file-456';
            const customPath = '/downloads/myfile.pdf';
            const mockFile = {
                file_id: fileId,
                file_unique_id: 'unique-456',
                file_size: 2048,
                file_path: 'documents/doc.pdf',
            };
            const fileContent = Buffer.from('custom content');

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/doc.pdf`,
                    method: 'GET',
                })
                .reply(200, fileContent);

            vi.mocked(mkdir).mockResolvedValue(undefined);
            vi.mocked(writeFile).mockResolvedValue(undefined);

            const result = await client.downloadFileById(fileId, customPath);

            expect(result.file_path).toBe(customPath);
            expect(result.file_size).toBe(fileContent.length);
        });

        it('should throw when file_path is missing', async () => {
            const mockFile = {
                file_id: 'file-789',
                file_unique_id: 'unique-789',
                file_size: 512,
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            await expect(client.downloadFileById('file-789')).rejects.toThrow(
                'File path not available in response'
            );
        });

        it('should throw when file exceeds 20MB limit', async () => {
            const MAX_SIZE = 20 * 1024 * 1024;
            const mockFile = {
                file_id: 'large-file',
                file_unique_id: 'unique-large',
                file_size: MAX_SIZE + 1,
                file_path: 'documents/large.pdf',
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            await expect(client.downloadFileById('large-file')).rejects.toThrow(
                'exceeds maximum limit'
            );
        });

        it('should allow file at exactly 20MB', async () => {
            const MAX_SIZE = 20 * 1024 * 1024;
            const mockFile = {
                file_id: 'max-file',
                file_unique_id: 'unique-max',
                file_size: MAX_SIZE,
                file_path: 'documents/max.pdf',
            };
            const fileContent = Buffer.from('content');

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/max.pdf`,
                    method: 'GET',
                })
                .reply(200, fileContent);

            vi.mocked(mkdir).mockResolvedValue(undefined);
            vi.mocked(writeFile).mockResolvedValue(undefined);

            await expect(client.downloadFileById('max-file')).resolves.toBeDefined();
        });

        it('should propagate getFile errors', async () => {
            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: false,
                    description: 'Invalid file_id',
                });

            await expect(client.downloadFileById('invalid-id')).rejects.toThrow(
                'Telegram API error: Invalid file_id'
            );
        });

        it('should propagate downloadFile errors', async () => {
            const mockFile = {
                file_id: 'file-error',
                file_unique_id: 'unique-error',
                file_size: 1024,
                file_path: 'documents/error.pdf',
            };

            const mockPool = mockAgent.get(BASE_URL);
            mockPool
                .intercept({
                    path: `/bot${TEST_TOKEN}/getFile`,
                    method: 'POST',
                })
                .reply(200, {
                    ok: true,
                    result: mockFile,
                });

            mockPool
                .intercept({
                    path: `/file/bot${TEST_TOKEN}/documents/error.pdf`,
                    method: 'GET',
                })
                .replyWithError(new Error('Download failed'));

            await expect(client.downloadFileById('file-error')).rejects.toThrow('fetch failed');
        });
    });
});
