import { PrismaClient } from '@prisma/client';

// Mot PrismaClient dung chung cho ca ung dung (thay cho AppDbContext cua Entity Framework).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
});
