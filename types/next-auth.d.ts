import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      username: string;
      email: string | null;
    };
  }
}
