import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { requireSupabaseAuth } from "../middlewares/require-supabase-auth";
import { authenticatedUserRateLimit } from "../middlewares/user-rate-limit";

const router: IRouter = Router();

router.use(healthRouter);

// All versioned business endpoints must be mounted under /v1 after this guard.
router.use("/v1", requireSupabaseAuth, authenticatedUserRateLimit);

export default router;
