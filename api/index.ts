import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerRedirectRoute } from "../server/_core/redirect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// Try multiple paths:
// Local dev: ../dist/public (relative to api/index.ts)
// Vercel @vercel/node with includeFiles: dist/public is at project root
// Vercel @vercel/node bundled: .vercel/output/functions/api.func/dist/public
const staticPaths = [
  path.resolve(__dirname, "..", "dist", "public"),  // local dev
  path.resolve(__dirname, "dist", "public"),         // Vercel bundled
  path.resolve(process.cwd(), "dist", "public"),     // Vercel cwd
];

const staticPath = staticPaths.find(p => {
  try {
    return existsSync(path.resolve(p, "index.html"));
  } catch {
    return false;
  }
}) || staticPaths[0];

app.use(express.static(staticPath));

// SPA fallback - serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(staticPath, "index.html"));
});

// Export for Vercel serverless function
export default app;
