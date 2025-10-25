import { TelegramClient } from './TelegramClient.js';
import { PollingService } from '../services/PollingService.js';
import { StateManager } from '../services/StateManager.js';
import { UpdateHandler } from '../handlers/UpdateHandler.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { CommandHandler } from '../handlers/CommandHandler.js';
import { Logger } from '../utils/Logger.js';

export class Bot {
    private client: TelegramClient;
    private stateManager: StateManager;
    private pollingService: PollingService;
    private updateHandler: UpdateHandler;
    private commandHandler: CommandHandler;
    private logger: Logger;

    constructor(token: string) {
        this.logger = new Logger('Bot');
        this.client = new TelegramClient(token);
        this.stateManager = new StateManager();
        this.pollingService = new PollingService(this.client, this.stateManager);
        this.commandHandler = new CommandHandler(this.client);
        const messageHandler = new MessageHandler(this.client, this.commandHandler);
        this.updateHandler = new UpdateHandler(messageHandler);
    }

    async start(): Promise<void> {
        try {
            await this.stateManager.load();

            const botInfo = await this.client.getMe();
            this.logger.info(`Bot started: @${botInfo.username}`);

            await this.commandHandler.registerBotCommands();

            await this.pollingService.start(async (update) => {
                await this.updateHandler.handle(update);
            });
        } catch (error) {
            this.logger.error('Failed to start bot', error as Error);
            throw error;
        }
    }

    stop(): void {
        this.pollingService.stop();
        this.logger.info('Bot stopped');
    }

    getCommandHandler(): CommandHandler {
        return this.commandHandler;
    }
}
