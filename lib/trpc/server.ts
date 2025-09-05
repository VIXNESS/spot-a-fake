import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

// Define the context type
export interface Context {
  user?: {
    id: string;
    email?: string;
    role?: string;
  } | null;
}

// Create the tRPC instance with context
const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Define the app router
export const appRouter = router({
  greeting: t.procedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ ctx, input }) => {
      // Only allow access if user is logged in (ctx.user exists)
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access this endpoint.',
        });
      }
      return {
        message: `Hello ${input.name ?? 'World'}! Welcome to tRPC in your Spot-a-Fake app! 🚀`,
        timestamp: new Date().toISOString(),
      };
    }),
  
  getGreeting: publicProcedure
    .query(() => {
      return {
        message: 'Hello from tRPC! The setup is working correctly.',
        status: 'success',
        timestamp: new Date().toISOString(),
      };
    }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;
