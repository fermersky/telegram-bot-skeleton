export interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface Chat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
}

export interface PhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}

export interface Document {
    file_name: string;
    mime_type: string;
    file_id: string;
    file_unique_id: string;
    file_size: number;
    thumbnail?: {
        file_id: string;
        file_unique_id: string;
        file_size: number;
        width: number;
        height: number;
    };
    thumb?: {
        file_id: string;
        file_unique_id: string;
        file_size: number;
        width: number;
        height: number;
    };
}

export interface Message {
    message_id: number;
    from?: User;
    chat: Chat;
    date: number;
    text?: string;
    photo?: PhotoSize[];
    document?: Document;
    entities?: MessageEntity[];
}

export interface MessageEntity {
    type: string;
    offset: number;
    length: number;
}

export interface Update {
    update_id: number;
    message?: Message;
    edited_message?: Message;
    channel_post?: Message;
    edited_channel_post?: Message;
}

export interface GetUpdatesParams {
    offset?: number;
    limit?: number;
    timeout?: number;
    allowed_updates?: string[];
}

export interface SendMessageParams {
    chat_id: number | string;
    text: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_to_message_id?: number;
}

export interface BotCommand {
    command: string;
    description: string;
}

export interface SetMyCommandsParams {
    commands: BotCommand[];
    scope?: object;
    language_code?: string;
}

export interface TelegramResponse<T> {
    ok: boolean;
    result: T;
    description?: string;
    error_code?: number;
}

export interface BotState {
    offset: number;
}

export interface File {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
}

export interface GetFileParams {
    file_id: string;
}

export interface DownloadFileResult {
    file_path: string;
    file_size: number;
}
