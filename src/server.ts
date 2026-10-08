import { createApp } from "./app/app";
import { config } from "./config";
import { logger } from "./shared/logger/logger";
import { db } from "./database/knex";

async function bootstrap(): Promise<void> {
  try {
    await db.raw("SELECT 1");
  } catch (error) {
    logger.error({ err: error }, "Database connection failed");
    logger.error(
      `Fix DB_* in the env file for APP_ENV=${config.appEnv}, create the database, then run: npm run setup`
    );
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    // Plain-text startup summary for the terminal; structured logs stay in pino.
    process.stdout.write(
      [
        `Running env : ${config.appEnv}`,
        `Connected DB: ${config.db.name}`,
        `Running port: ${config.port}`,
      ].join("\n") + "\n"
    );
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error(
        `Port ${config.port} is already in use. Stop the other server or set PORT.`
      );
    } else {
      logger.error({ err: error }, "Server failed to start");
    }
    process.exit(1);
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
