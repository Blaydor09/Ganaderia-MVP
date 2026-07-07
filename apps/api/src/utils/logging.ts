import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";

export const REDACTED_VALUE = "[REDACTED]";

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "passwordhash",
  "registrationcode",
  "refreshtoken",
  "accesstoken",
  "token",
  "tokenhash",
  "currentpassword",
  "newpassword",
  "temporarypassword",
  "mfacode",
  "mfaenrollmenttoken",
  "enrollmenttoken",
  "mfasecret",
  "mfasecretencrypted",
  "jwt_secret",
  "jwtrefreshsecret",
  "database_url",
  "secret",
]);

const sensitiveBodyPaths = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/password/forgot",
  "/api/v1/auth/password/reset",
  "/api/v1/platform/auth/login",
  "/api/v1/platform/auth/refresh",
  "/api/v1/platform/auth/mfa/setup",
  "/api/v1/platform/auth/mfa/confirm",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSensitiveKey = (key: string) => sensitiveKeys.has(key.toLowerCase());

export const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (depth > 5) {
    return "[Truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveKey(key) ? REDACTED_VALUE : sanitizeValue(nestedValue, depth + 1),
      ])
    );
  }

  if (typeof value === "string" && value.length > 4096) {
    return `${value.slice(0, 4096)}...[truncated]`;
  }

  return value;
};

export const sanitizeHeaders = (headers: IncomingHttpHeaders | Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      isSensitiveKey(key) ? REDACTED_VALUE : sanitizeValue(value),
    ])
  );

export const sanitizeRequestBody = (url: string | undefined, body: unknown) => {
  if (body === undefined) {
    return undefined;
  }

  const pathname = (url ?? "").split("?")[0];
  if (sensitiveBodyPaths.has(pathname)) {
    return REDACTED_VALUE;
  }

  return sanitizeValue(body);
};

export const sanitizeErrorLike = (error: unknown) => {
  if (!isPlainObject(error) && !(error instanceof Error)) {
    return sanitizeValue(error);
  }

  const candidate = error as Record<string, unknown> & {
    name?: string;
    message?: string;
    stack?: string;
  };

  return {
    name: candidate.name,
    message: candidate.message,
    code: candidate.code,
    stack: candidate.stack,
    details: sanitizeValue(candidate.details),
    config: sanitizeValue(candidate.config),
    request: sanitizeValue(candidate.request),
    response: sanitizeValue(candidate.response),
    cause: sanitizeValue(candidate.cause),
  };
};

export const serializeRequest = (
  req: IncomingMessage & {
    body?: unknown;
    id?: string;
    remoteAddress?: string;
    remotePort?: number;
  }
) => ({
  id: req.id,
  method: req.method,
  url: req.url,
  headers: sanitizeHeaders(req.headers),
  body: sanitizeRequestBody(req.url, req.body),
  remoteAddress: req.socket?.remoteAddress ?? req.remoteAddress,
  remotePort: req.socket?.remotePort ?? req.remotePort,
});

export const serializeResponse = (
  res: ServerResponse & {
    getHeaders?: () => Record<string, unknown>;
  }
) => ({
  statusCode: res.statusCode,
  headers: typeof res.getHeaders === "function" ? sanitizeHeaders(res.getHeaders()) : {},
});
