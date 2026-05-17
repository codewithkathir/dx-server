import { createApp } from "./app/app";
import { config } from "./config";
import { logger } from "./shared/logger/logger";
import { db } from "./database/knex";

async function bootstrap(): Promise<void> {
  try {
    await db.raw("SELECT 1");
    logger.info("Database connection established");
  } catch (error) {
    logger.error({ err: error }, "Database connection failed");
    logger.error(
      "Fix DB_* in .env, create the database, then run: npm run setup"
    );
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv },
      "Server started"
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await db.destroy();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap();
