import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import pool from "../config/database";
import { EmailMessage } from "../types";

const gmail = google.gmail("v1");

export class EmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
  }

  async fetchGmailEmails(
    userId: string,
    refreshToken: string
  ): Promise<EmailMessage[]> {
    try {
      // Set credentials
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // Get messages from last hour
      const oneHourAgo = Math.floor((Date.now() - 3600000) / 1000);
      const query = `after:${oneHourAgo}`;

      const response = await gmail.users.messages.list({
        auth: this.oauth2Client,
        userId: "me",
        q: query,
      });

      const messages = response.data.messages || [];
      const emailMessages: EmailMessage[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        const fullMessage = await gmail.users.messages.get({
          auth: this.oauth2Client,
          userId: "me",
          id: message.id,
        });

        const headers = fullMessage.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "";
        const body = this.extractEmailBody(fullMessage.data);

        // Check if already exists
        const existingEmail = await pool.query(
          "SELECT id FROM email_messages WHERE google_message_id = $1",
          [message.id]
        );

        if (existingEmail.rows.length === 0) {
          const result = await pool.query(
            `INSERT INTO email_messages 
            (user_id, google_message_id, "from", subject, body, received_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
              userId,
              message.id,
              from,
              subject,
              body,
              new Date(parseInt(fullMessage.data.internalDate || "0")),
            ]
          );

          emailMessages.push({
            id: result.rows[0].id,
            userId,
            googleMessageId: message.id,
            from,
            subject,
            body,
            receivedAt: new Date(
              parseInt(fullMessage.data.internalDate || "0")
            ),
            processed: false,
            createdAt: new Date(),
          });
        }
      }

      return emailMessages;
    } catch (error) {
      console.error("Error fetching Gmail emails:", error);
      throw error;
    }
  }

  private extractEmailBody(message: any): string {
    let body = "";

    const payload = message.payload;
    if (!payload) return body;

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain") {
          body = Buffer.from(part.body.data || "", "base64").toString();
          break;
        }
      }
    } else if (payload.body?.data) {
      body = Buffer.from(payload.body.data, "base64").toString();
    }

    return body.substring(0, 5000); // Limit body length
  }

  async markEmailsAsProcessed(emailIds: string[]): Promise<void> {
    if (emailIds.length === 0) return;

    await pool.query(
      "UPDATE email_messages SET processed = TRUE WHERE id = ANY($1)",
      [emailIds]
    );
  }
}
