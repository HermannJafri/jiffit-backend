export {};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: number;
        actor: 'dashboard' | 'customer' | 'hero';
        role?: string;
        phone?: string;
        username?: string;
      };
    }
  }
}
