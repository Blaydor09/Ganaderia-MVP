import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import YAML from "yaml";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error";
import swaggerUi from "swagger-ui-express";
import {
  REDACTED_VALUE,
  sanitizeErrorLike,
  serializeRequest,
  serializeResponse,
} from "./utils/logging";
import { prisma } from "./config/prisma";

export const createApp = () => {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", "loopback");
  }

  app.use(
    pinoHttp({
      genReqId: (req, res) => {
        const headerRequestId = req.headers["x-request-id"];
        const requestId =
          typeof headerRequestId === "string" && headerRequestId.trim().length > 0
            ? headerRequestId.trim()
            : randomUUID();
        res.setHeader("x-request-id", requestId);
        return requestId;
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
          "req.body.password",
          "req.body.registrationCode",
          "req.body.refreshToken",
          "req.body.currentPassword",
          "req.body.newPassword",
          "req.body.temporaryPassword",
          "err.config.headers.Authorization",
          "err.config.headers.authorization",
          "err.response.config.headers.Authorization",
          "err.response.config.headers.authorization",
          "err.request._header",
        ],
        censor: REDACTED_VALUE,
      },
      serializers: {
        req: serializeRequest,
        res: serializeResponse,
        err: sanitizeErrorLike,
      },
    })
  );
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/v1/health/live", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/v1/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  if (env.enableDocs) {
    const docsPath = path.join(process.cwd(), "docs", "openapi.yaml");
    if (fs.existsSync(docsPath)) {
      const raw = fs.readFileSync(docsPath, "utf-8");
      const spec = YAML.parse(raw);
      app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(spec));
    }
  }

  app.use("/api/v1", apiRoutes);
  app.use(errorHandler);

  return app;
};
