export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] [${this.context}] ${message}`;
    }

    info(message: string): void {
        console.log(this.formatMessage('INFO', message));
    }

    error(message: string, error?: Error): void {
        console.error(this.formatMessage('ERROR', message));
        if (error) {
            console.error(error.stack);
        }
    }

    warn(message: string): void {
        console.warn(this.formatMessage('WARN', message));
    }

    debug(message: string): void {
        console.debug(this.formatMessage('DEBUG', message));
    }
}
