import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, type Context } from '@/lib/trpc/server';
import { getUser, getUserProfile } from '@/lib/utils/auth';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      try {
        const user = await getUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          return {
            user: {
              id: user.id,
              email: user.email,
              role: profile?.role,
            },
          };
        }
        return { user: null };
      } catch (error) {
        console.error('Error creating tRPC context:', error);
        return { user: null };
      }
    },
  });

export { handler as GET, handler as POST };
