import { createHash } from "node:crypto";
import type { Request } from "express";
import { logger } from "./logger";

export type SecurityEventName =
  | "authentication_failed"
  | "authorization_failed"
  | "rate_limit_exceeded"
  | "cors_origin_rejected"
  | "http_server_error";

export function logSecurityEvent(
  event: SecurityEventName,
  req: Request,
  details: Record<string, string | number | boolean> = {},
): void {
  const address = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const source = createHash("sha256").update(address).digest("hex").slice(0, 16);

  logger.warn(
    {
      securityEvent: event,
      source,
      method: req.method,
      path: req.path,
      ...details,
    },
    "Security event",
  );
}

export function securityEventMonitor(
  req: Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  res.on("finish", () => {
    if (res.statusCode === 401) {
      logSecurityEvent("authentication_failed", req, { statusCode: res.statusCode });
    } else if (res.statusCode === 403) {
      logSecurityEvent("authorization_failed", req, { statusCode: res.statusCode });
    } else if (res.statusCode >= 500) {
      logSecurityEvent("http_server_error", req, { statusCode: res.statusCode });
    }
  });

  next();
}
