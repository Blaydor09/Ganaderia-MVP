import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import YAML from "yaml";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error";
import swaggerUi from "swagger-ui-express";

export const createApp = () => {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(pinoHttp());
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const docsPath = path.join(process.cwd(), "docs", "openapi.yaml");
  if (fs.existsSync(docsPath)) {
    const raw = fs.readFileSync(docsPath, "utf-8");
    const spec = YAML.parse(raw);
    app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use("/api/v1", apiRoutes);
  app.use(errorHandler);

  return app;
};
