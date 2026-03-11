import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${env.port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `Port ${env.port} is already in use. Stop the existing process or change PORT in apps/api/.env.`
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
