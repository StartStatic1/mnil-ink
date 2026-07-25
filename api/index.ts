import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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
// @vercel/static-build puts dist/public into the static output
// We can import from relative path since the build script runs vite build
const staticPath = path.resolve(__dirname, "..", "dist", "public");

app.use(express.static(staticPath));

// SPA fallback - serve index.html for all unmatched routes
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(staticPath, "index.html"));
});

// Export for Vercel serverless function
export default app;
