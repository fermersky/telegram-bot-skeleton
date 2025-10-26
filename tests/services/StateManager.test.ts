import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/services/StateManager.js';

vi.mock('fs/promises');
vi.mock('fs');

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);
const mockExistsSync = vi.mocked(existsSync);

describe('StateManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default path', () => {
            const manager = new StateManager();
            expect(manager).toBeInstanceOf(StateManager);
            expect(manager.getOffset()).toBe(0);
        });

        it('should initialize with custom path', () => {
            const customPath = './custom/state.json';
            const manager = new StateManager(customPath);
            expect(manager).toBeInstanceOf(StateManager);
            expect(manager.getOffset()).toBe(0);
        });

        it('should start with offset 0', () => {
            const manager = new StateManager();
            expect(manager.getOffset()).toBe(0);
        });
    });

    describe('load()', () => {
        it('should create new state file when file does not exist', async () => {
            mockExistsSync.mockReturnValue(false);

            const manager = new StateManager('./data/state.json');
            await manager.load();

            expect(mockExistsSync).toHaveBeenCalledWith('./data/state.json');
            expect(mockExistsSync).toHaveBeenCalledWith('./data');

            expect(mockMkdir).toHaveBeenCalledWith('./data', { recursive: true });

            expect(mockWriteFile).toHaveBeenCalledWith(
                './data/state.json',
                JSON.stringify({ offset: 0 }, null, 2)
            );

            expect(manager.getOffset()).toBe(0);
        });

        it('should load existing state from file', async () => {
            const existingState = { offset: 42 };
            mockExistsSync.mockReturnValue(true);
            mockReadFile.mockResolvedValue(JSON.stringify(existingState));

            const manager = new StateManager('./data/state.json');
            await manager.load();

            expect(mockReadFile).toHaveBeenCalledWith('./data/state.json', 'utf-8');
            expect(manager.getOffset()).toBe(42);
        });

        it('should handle file read errors gracefully', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFile.mockRejectedValue(new Error('File read error'));

            const manager = new StateManager('./data/state.json');
            await manager.load();

            expect(manager.getOffset()).toBe(0);
        });

        it('should handle invalid JSON gracefully', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFile.mockResolvedValue('invalid json {{{');

            const manager = new StateManager('./data/state.json');
            await manager.load();

            expect(manager.getOffset()).toBe(0);
        });
    });

    describe('save()', () => {
        it('should save state to file', async () => {
            mockExistsSync.mockReturnValue(true);

            const manager = new StateManager('./data/state.json');
            await manager.save();

            expect(mockWriteFile).toHaveBeenCalledWith(
                './data/state.json',
                JSON.stringify({ offset: 0 }, null, 2)
            );
        });

        it('should create directory if it does not exist before saving', async () => {
            mockExistsSync.mockReturnValue(false);

            const manager = new StateManager('./data/state.json');
            await manager.save();

            expect(mockMkdir).toHaveBeenCalledWith('./data', { recursive: true });
            expect(mockWriteFile).toHaveBeenCalled();
        });

        it('should handle write errors gracefully', async () => {
            mockExistsSync.mockReturnValue(true);
            mockWriteFile.mockRejectedValue(new Error('Write error'));

            const manager = new StateManager('./data/state.json');

            await expect(manager.save()).resolves.toBeUndefined();
        });
    });

    describe('getOffset()', () => {
        it('should return current offset', () => {
            const manager = new StateManager();
            expect(manager.getOffset()).toBe(0);
        });

        it('should return updated offset after setOffset', async () => {
            mockExistsSync.mockReturnValue(true);

            const manager = new StateManager();
            await manager.setOffset(100);

            expect(manager.getOffset()).toBe(100);
        });
    });

    describe('setOffset()', () => {
        it('should update offset and save', async () => {
            mockExistsSync.mockReturnValue(true);

            const manager = new StateManager('./data/state.json');
            await manager.setOffset(123);

            expect(manager.getOffset()).toBe(123);
            expect(mockWriteFile).toHaveBeenCalledWith(
                './data/state.json',
                JSON.stringify({ offset: 123 }, null, 2)
            );
        });

        it('should persist state across multiple setOffset calls', async () => {
            mockExistsSync.mockReturnValue(true);

            const manager = new StateManager('./data/state.json');

            await manager.setOffset(10);
            expect(manager.getOffset()).toBe(10);

            await manager.setOffset(20);
            expect(manager.getOffset()).toBe(20);

            await manager.setOffset(30);
            expect(manager.getOffset()).toBe(30);

            expect(mockWriteFile).toHaveBeenCalledTimes(3);
        });
    });

    describe('ensureDirectoryExists() - indirect tests', () => {
        it('should not create directory when it already exists', async () => {
            mockExistsSync.mockReturnValue(true);

            const manager = new StateManager('./data/state.json');
            await manager.save();

            expect(mockMkdir).not.toHaveBeenCalled();
        });

        it('should create directory when it does not exist', async () => {
            mockExistsSync.mockReturnValue(false);

            const manager = new StateManager('./data/state.json');
            await manager.save();

            expect(mockMkdir).toHaveBeenCalledWith('./data', { recursive: true });
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete load-modify-save cycle', async () => {
            const initialState = { offset: 50 };

            mockExistsSync.mockReturnValue(true);
            mockReadFile.mockResolvedValue(JSON.stringify(initialState));

            const manager = new StateManager('./data/state.json');

            await manager.load();
            expect(manager.getOffset()).toBe(50);

            expect(mockReadFile).toHaveBeenCalledWith('./data/state.json', 'utf-8');

            await manager.setOffset(60);
            expect(manager.getOffset()).toBe(60);

            expect(mockWriteFile).toHaveBeenLastCalledWith(
                './data/state.json',
                JSON.stringify({ offset: 60 }, null, 2)
            );
        });
    });
});
