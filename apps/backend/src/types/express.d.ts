declare global {
  namespace Express {
    interface User {
      /** JWT subject (user ID) — set by authenticate middleware */
      sub: string;
    }
  }
}

export {};
