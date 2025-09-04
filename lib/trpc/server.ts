import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// Create the tRPC instance
const t = initTRPC.create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Define the app router
export const appRouter = router({
  greeting: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
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
