import type { Express } from "express";
import { getLinkBySlug, incrementClickCount } from "../db";

/**
 * Register the /:slug redirect route.
 * This MUST be registered BEFORE the static/Vite fallback,
 * but AFTER api routes.
 * We skip known paths like /api, /assets, etc.
 */
const SKIP_PATHS = [
  "api",
  "assets",
  "favicon.ico",
  "robots.txt",
  "login",
  "dashboard",
  "admin",
];

export function registerRedirectRoute(app: Express) {
  app.get("/:slug", async (req, res, next) => {
    const slug = req.params.slug;

    // Skip system paths
    if (slug.startsWith(".") || slug.startsWith("_") || SKIP_PATHS.includes(slug)) {
      return next();
    }

    // Look up the slug
    const link = await getLinkBySlug(slug);

    if (!link) {
      return next(); // Let static/Vite handle it (will show 404 page)
    }

    // Increment click count
    try {
      await incrementClickCount(slug);
    } catch (err) {
      console.error("[Redirect] Failed to increment click count:", err);
    }

    // Redirect to the original URL
    return res.redirect(302, link.url);
  });
}
