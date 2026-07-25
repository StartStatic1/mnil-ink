import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { getLinkBySlug, incrementClickCount } from "../server/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// tRPC API routes
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Auth redirect
app.get("/api/auth/login", (_req, res) => {
  res.redirect(302, "/login");
});

// Slug redirect handler
app.get("/:slug", async (req, res, next) => {
  // Skip static asset paths
  const slug = req.params.slug;
  if (!slug || slug.startsWith(".") || slug.includes("/")) {
    return next();
  }

  try {
    const link = await getLinkBySlug(slug);
    if (link) {
      // Increment click count in background
      incrementClickCount(slug).catch(() => {});

      if (link.url) {
        // Handle 301 permanent redirect
        res.redirect(301, link.url);
      } else {
        res.status(404).send("Link not found");
      }
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[API Error]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Export for Vercel serverless function
export default app;
