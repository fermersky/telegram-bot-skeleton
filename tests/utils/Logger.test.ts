import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '../../src/utils/Logger';

describe('Logger', () => {
    let logger: Logger;
    let consoleSpy: any;

    beforeEach(() => {
        logger = new Logger('TestContext');
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(),
            error: vi.spyOn(console, 'error').mockImplementation(),
            warn: vi.spyOn(console, 'warn').mockImplementation(),
            debug: vi.spyOn(console, 'debug').mockImplementation(),
        };
    });

    describe('info', () => {
        it('should log string messages', () => {
            logger.info('test message');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('[INFO] [TestContext] test message')
            );
        });

        it('should log object messages as JSON', () => {
            const testObj = { userId: 123, action: 'login' };
            logger.info(testObj);
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(JSON.stringify(testObj, null, 2))
            );
        });

        it('should log arrays as JSON', () => {
            const testArray = [1, 2, 3];
            logger.info(testArray);
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(JSON.stringify(testArray, null, 2))
            );
        });
    });

    describe('error', () => {
        it('should log string messages', () => {
            logger.error('error message');
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR] [TestContext] error message')
            );
        });

        it('should log object messages as JSON', () => {
            const errorObj = { error: 'Connection failed', code: 500 };
            logger.error(errorObj);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining(JSON.stringify(errorObj, null, 2))
            );
        });

        it('should log error stack when provided', () => {
            const error = new Error('Test error');
            logger.error('error occurred', error);
            expect(consoleSpy.error).toHaveBeenCalledTimes(2);
            expect(consoleSpy.error).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining(error.stack!)
            );
        });
    });

    describe('warn', () => {
        it('should log string messages', () => {
            logger.warn('warning message');
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining('[WARN] [TestContext] warning message')
            );
        });

        it('should log object messages as JSON', () => {
            const warnObj = { warning: 'Deprecated API', version: '2.0' };
            logger.warn(warnObj);
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining(JSON.stringify(warnObj, null, 2))
            );
        });
    });

    describe('debug', () => {
        it('should log string messages', () => {
            logger.debug('debug message');
            expect(consoleSpy.debug).toHaveBeenCalledWith(
                expect.stringContaining('[DEBUG] [TestContext] debug message')
            );
        });

        it('should log object messages as JSON', () => {
            const debugObj = { state: { offset: 42, users: [1, 2, 3] } };
            logger.debug(debugObj);
            expect(consoleSpy.debug).toHaveBeenCalledWith(
                expect.stringContaining(JSON.stringify(debugObj, null, 2))
            );
        });
    });
});
