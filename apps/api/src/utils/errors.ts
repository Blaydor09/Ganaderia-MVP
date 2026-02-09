export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.status = status;
    if (code) {
      this.code = code;
    } else if (
      typeof details === "object" &&
      details !== null &&
      "code" in (details as Record<string, unknown>) &&
      typeof (details as Record<string, unknown>).code === "string"
    ) {
      this.code = (details as Record<string, string>).code;
    }
    this.details = details;
  }
}
