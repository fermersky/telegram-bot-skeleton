export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private formatMessage(level: string, message: any): string {
        const timestamp = new Date().toISOString();
        const formattedMessage = typeof message === 'object'
            ? JSON.stringify(message, null, 2)
            : message;
        return `[${timestamp}] [${level}] [${this.context}] ${formattedMessage}`;
    }

    info(message: any): void {
        console.log(this.formatMessage('INFO', message));
    }

    error(message: any, error?: Error): void {
        console.error(this.formatMessage('ERROR', message));
        if (error) {
            console.error(error.stack);
        }
    }

    warn(message: any): void {
        console.warn(this.formatMessage('WARN', message));
    }

    debug(message: any): void {
        console.debug(this.formatMessage('DEBUG', message));
    }
}
