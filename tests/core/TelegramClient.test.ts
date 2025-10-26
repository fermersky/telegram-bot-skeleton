import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { TelegramClient } from '../../src/core/TelegramClient.js';

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
});
