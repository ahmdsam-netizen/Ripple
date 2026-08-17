import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "ripple_token";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type AuthRequest = Request & { user?: AuthUser };

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET must be set");
  return value;
}

export function createToken(user: AuthUser) {
  return jwt.sign(user, secret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, secret()) as AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};
