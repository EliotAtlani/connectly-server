export interface MessageProps {
  content: string;
  from_user_id: string;
  from_username: string;
  chatId: string;
  __createdtime__: string;
  file?: Buffer;
  replyMessageId?: string;
  replyTo?: MessageProps;
}
