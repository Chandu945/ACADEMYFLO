export const EMAIL_SENDER_PORT = Symbol('EMAIL_SENDER_PORT');

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSenderPort {
  send(message: EmailMessage): Promise<boolean>;
}
