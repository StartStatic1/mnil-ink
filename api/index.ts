import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerRedirectRoute } from "../server/_core/redirect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// On Vercel, api/index.ts is at .vercel/output/functions/api.func/api/index.js
// Project root is 2 levels up
const projectRoot = path.resolve(__dirname, "..");

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

// Slug redirect route - MUST be before static serving
registerRedirectRoute(app);

// Serve static files from Vite build output
const staticPath = path.resolve(projectRoot, "dist", "public");

app.use(express.static(staticPath));

// SPA fallback - serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(staticPath, "index.html"));
});

// Export for Vercel serverless function
export default app;
