import { Queue } from "bullmq";
import { config } from "../config";

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

export function createQueue(name: string): Queue | null {
  if (!config.redis.enabled) {
    return null;
  }
  return new Queue(name, { connection });
}

export const emailQueue = createQueue("email-queue");
