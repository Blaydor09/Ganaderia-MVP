import { createHash, randomBytes } from "crypto";

export const generateInviteToken = () => randomBytes(32).toString("hex");

export const hashInviteToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
