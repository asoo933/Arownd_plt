import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./middlewares/security-headers";
import { apiRateLimit } from "./middlewares/rate-limit";
import { securityEventMonitor } from "./lib/security-events";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = new Set(
  (process.env.API_CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const configuredProxyHops = Number(process.env.API_TRUST_PROXY_HOPS ?? "0");
if (
  Number.isSafeInteger(configuredProxyHops) &&
  configuredProxyHops >= 0 &&
  configuredProxyHops <= 3
) {
  app.set("trust proxy", configuredProxyHops);
}

app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      logger.warn(
        { securityEvent: "cors_origin_rejected", origin: origin.slice(0, 200) },
        "CORS origin rejected",
      );
      callback(null, false);
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "apikey", "x-requested-with"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/api", apiRateLimit);
app.use(securityEventMonitor);
app.use("/api", router);

if (isProduction && allowedOrigins.size === 0) {
  logger.warn(
    { securityEvent: "cors_allowlist_missing" },
    "API_CORS_ORIGINS is empty; browser-origin requests will not receive CORS permission",
  );
}

export default app;
