import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sdk } from "./_core/sdk";

const nanoid = (size: number) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidCustomSlug(slug: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(slug) && slug.length >= 1 && slug.length <= 64;
}

async function generateUniqueSlug(length = 2, attempts = 50): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const slug = nanoid(length);
    const unique = await db.isSlugUnique(slug);
    if (unique) return slug;
  }
  // Fallback: keep trying with same length
  for (let i = 0; i < attempts; i++) {
    const slug = nanoid(length);
    const unique = await db.isSlugUnique(slug);
    if (unique) return slug;
  }
  // Last resort: 3 chars with uniqueness check
  for (let i = 0; i < attempts; i++) {
    const slug = nanoid(length + 1);
    const unique = await db.isSlugUnique(slug);
    if (unique) return slug;
  }
  throw new Error("Não foi possível gerar um slug único. Tente novamente.");
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email().min(1),
        name: z.string().min(1).max(100).optional(),
        password: z.string().min(8),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Banco de dados não disponível");
        const openId = `user_${input.email}`;
        await db.upsertUser({
          openId,
          email: input.email,
          name: input.name || input.email.split("@")[0],
          loginMethod: "email",
          lastSignedIn: new Date(),
        });
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new Error("Falha ao criar usuário");
        const sessionToken = await sdk.createSessionToken(user);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
        return {
          user: { id: user.id, name: user.name, email: user.email },
        };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Banco de dados não disponível");
        const openId = `user_${input.email}`;
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new Error("Usuário não encontrado. Registre-se primeiro.");
        const sessionToken = await sdk.createSessionToken(user);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
        return {
          user: { id: user.id, name: user.name, email: user.email },
        };
      }),
  }),

  links: router({
    /**
     * Create a shortened link.
     * Input: { url: string, customSlug?: string }
     */
    create: publicProcedure
      .input(z.object({
        url: z.string().min(1, "URL é obrigatória"),
        customSlug: z.string().min(1).max(64).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validate URL
        if (!isValidUrl(input.url)) {
          throw new Error("URL inválida. Insira uma URL completa com http:// ou https://");
        }

        let slug: string;

        if (input.customSlug) {
          // Validate custom slug format
          if (!isValidCustomSlug(input.customSlug)) {
            throw new Error("Slug personalizado inválido. Use apenas letras, números, hífens e underlines.");
          }
          // Check uniqueness
          const unique = await db.isSlugUnique(input.customSlug);
          if (!unique) {
            throw new Error("Este slug já está em uso. Tente outro.");
          }
          slug = input.customSlug;
        } else {
          slug = await generateUniqueSlug();
        }

        const link = await db.createLink({
          slug,
          url: input.url,
          userId: ctx.user?.id ?? null,
        });

        return {
          slug: link.slug,
          url: link.url,
          shortUrl: `${(ctx.req.headers['x-forwarded-proto'] || 'https')}://${ctx.req.headers.host || 'mnil.ink'}/${link.slug}`,
          createdAt: link.createdAt.toISOString(),
          clickCount: link.clickCount || 0,
        };
      }),

    /**
     * Get link by slug (for redirect info)
     */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const link = await db.getLinkBySlug(input.slug);
        if (!link) return null;
        return {
          slug: link.slug,
          url: link.url,
          clickCount: link.clickCount || 0,
          createdAt: link.createdAt.toISOString(),
        };
      }),

    /**
     * Get link history
     */
    getHistory: publicProcedure.query(async ({ ctx }) => {
      if (ctx.user) {
        const links = await db.getLinksByUser(ctx.user.id);
        return links.map(l => ({
          id: l.id,
          slug: l.slug,
          url: l.url,
          clickCount: l.clickCount || 0,
          createdAt: l.createdAt.toISOString(),
        }));
      }
      return [];
    }),

    /**
     * Delete a link (owner or admin only)
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const link = await db.getLinkById(input.id);
        if (!link) throw new Error("Link não encontrado");
        // Only the owner or admin can delete
        if (link.userId && link.userId !== ctx.user!.id && ctx.user!.role !== 'admin') {
          throw new Error("Você não tem permissão para deletar este link");
        }
        await db.deleteLink(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

export { isValidUrl, isValidCustomSlug, generateUniqueSlug };
