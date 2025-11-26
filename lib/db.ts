import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const createPrismaClient = () => {
  // Use Accelerate if PRISMA_ACCELERATE_URL is configured
  const isAccelerateEnabled = 
    process.env.PRISMA_ACCELERATE_URL && 
    process.env.PRISMA_ACCELERATE_URL.trim() !== "";

  const client = new PrismaClient({
    datasources: {
      db: { 
        url: isAccelerateEnabled 
          ? process.env.PRISMA_ACCELERATE_URL 
          : process.env.DATABASE_URL 
      },
    },
  });

  // Extend with Accelerate if enabled
  if (isAccelerateEnabled) {
    return client.$extends(withAccelerate());
  }

  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}