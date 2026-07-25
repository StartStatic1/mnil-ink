import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, InsertLink, links } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Links helpers ───

export async function createLink(link: InsertLink) {
  const db = await getDb();
  if (!db) {
    console.error("[DB] Database not available - DATABASE_URL may not be configured");
    throw new Error("Banco de dados nao disponivel. Verifique a configuracao de DATABASE_URL.");
  }
  try {
    await db.insert(links).values(link);
    const result = await db.select().from(links).where(eq(links.slug, link.slug)).limit(1);
    return result[0]!;
  } catch (error: any) {
    console.error("[DB] Error creating link:", error);
    throw new Error(`Erro ao criar link: ${error?.message || "Erro desconhecido"}`);
  }
}

export async function getLinkBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  return result[0];
}

export async function incrementClickCount(slug: string) {
  const db = await getDb();
  if (!db) return;
  // Use raw SQL for atomic increment to avoid race conditions
  await db.execute(sql`UPDATE ${links} SET clickCount = clickCount + 1 WHERE slug = ${slug}`);
}

export async function getLinksByUser(userId: number | null, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(links)
      .where(eq(links.userId, userId))
      .orderBy(desc(links.createdAt))
      .limit(limit);
  }
  return [];
}

export async function getAllLinks(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(links)
    .orderBy(desc(links.createdAt))
    .limit(limit);
}

export async function deleteLink(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(links).where(eq(links.id, id));
}

export async function getLinkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return result[0];
}

export async function isSlugUnique(slug: string) {
  const link = await getLinkBySlug(slug);
  return !link;
}
