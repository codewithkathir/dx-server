/**
 * Email job handler — process via BullMQ worker when Redis is enabled.
 * Do not block API requests; enqueue from service layer.
 */
export interface EmailJobPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export async function processEmailJob(payload: EmailJobPayload): Promise<void> {
  // Implement email sending (SMTP, etc.) in worker process
  void payload;
}
