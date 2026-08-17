import { Router } from "express";
import { compare, hash } from "bcrypt";
import prisma from "../../lib/prisma";
import { AUTH_COOKIE, authCookieOptions, createToken, requireAuth, type AuthRequest } from "../auth";

const router = Router();

function publicUser(user: { id: string; username: string; email: string }) {
  return { id: user.id, username: user.username, email: user.email };
}

router.post("/signup", async (req, res, next) => {
  try {
    const { username, password, email } = req.body ?? {};
    if (!username?.trim() || !email?.trim() || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Username, email, and a password of at least 6 characters are required" });
    }

    const user = await prisma.user.create({
      data: { username: username.trim(), email: email.trim().toLowerCase(), password: await hash(password, 10) },
    });
    const safeUser = publicUser(user);
    res.cookie(AUTH_COOKIE, createToken(safeUser), authCookieOptions);
    res.status(201).json({ user: safeUser });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return res.status(409).json({ error: "Username or email is already in use" });
    next(error);
  }
});

router.post("/signin", async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    const user = await prisma.user.findUnique({ where: { username: username?.trim() ?? "" } });
    if (!user || typeof password !== "string" || !(await compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const safeUser = publicUser(user);
    res.cookie(AUTH_COOKIE, createToken(safeUser), authCookieOptions);
    res.json({ user: safeUser });
  } catch (error) { next(error); }
});

router.post("/signout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions, maxAge: undefined });
  res.status(204).end();
});

router.get("/me", requireAuth, (req: AuthRequest, res) => res.json({ user: req.user }));

export default router;
