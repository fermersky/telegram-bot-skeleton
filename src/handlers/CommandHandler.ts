import type { Message, BotCommand } from '../types/telegram.js';
import { TelegramClient } from '../core/TelegramClient.js';
import { Logger } from '../utils/Logger.js';

type CommandCallback = (message: Message, args: string[]) => Promise<void>;

interface CommandDefinition {
    callback: CommandCallback;
    description: string;
}

export class CommandHandler {
    private client: TelegramClient;
    private logger: Logger;
    private commands: Map<string, CommandDefinition>;

    constructor(client: TelegramClient) {
        this.client = client;
        this.logger = new Logger('CommandHandler');
        this.commands = new Map();
        this.registerDefaultCommands();
    }

    registerCommand(command: string, description: string, callback: CommandCallback): void {
        this.commands.set(command, { callback, description });
        this.logger.info(`Registered command: /${command}`);
    }

    async registerBotCommands(): Promise<void> {
        try {
            const commands: BotCommand[] = Array.from(this.commands.entries()).map(
                ([command, def]) => ({
                    command,
                    description: def.description,
                })
            );

            await this.client.setMyCommands({ commands });
            this.logger.info(`Registered ${commands.length} commands with Telegram API`);
            this.logger.info(JSON.stringify(commands));
        } catch (error) {
            this.logger.error('Failed to register bot commands', error as Error);
        }
    }

    async handle(message: Message): Promise<void> {
        if (!message.text || !message.text.startsWith('/')) {
            return;
        }

        const [commandPart, ...args] = message.text.slice(1).split(' ');
        const command = commandPart.toLowerCase();

        const commandDef = this.commands.get(command);
        if (!commandDef) {
            this.logger.warn(`Unknown command: /${command}`);
            return;
        }

        try {
            await commandDef.callback(message, args);
        } catch (error) {
            this.logger.error(`Error handling command /${command}`, error as Error);
        }
    }

    private registerDefaultCommands(): void {
        this.registerCommand('start', 'Start the bot', async (message) => {
            await this.client.sendMessage({
                chat_id: message.chat.id,
                text: 'Hello! I am your bot. Send /help for available commands.',
            });
        });

        this.registerCommand('help', 'Show available commands', async (message) => {
            const commands = Array.from(this.commands.entries());
            const helpText = `Available commands:\n${commands.map(([cmd, def]) => `/${cmd} - ${def.description}`).join('\n')}`;
            await this.client.sendMessage({
                chat_id: message.chat.id,
                text: helpText,
            });
        });

        this.registerCommand('ping', 'Check if bot is alive', async (message) => {
            await this.client.sendMessage({
                chat_id: message.chat.id,
                text: 'Pong!',
            });
        });

        this.registerCommand('id', 'Get your user ID and chat information', async (message) => {
            const userId = message.from?.id || 'Unknown';
            const username = message.from?.username || 'N/A';
            const chatId = message.chat.id;
            const chatType = message.chat.type;

            let responseText = `👤 User ID: ${userId}\n`;
            responseText += `👤 Username: @${username}\n`;
            responseText += `💬 Chat ID: ${chatId}\n`;
            responseText += `💬 Chat Type: ${chatType}`;

            await this.client.sendMessage({
                chat_id: message.chat.id,
                text: responseText,
            });
        });
    }
}
