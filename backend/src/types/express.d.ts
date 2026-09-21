declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        displayName: string;
        role: string;
        mustChangePassword?: boolean;
        zonaAsignada?: string;
      };
    }
  }
}

export {};
