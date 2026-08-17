"use server"

import prisma from "@/lib/prisma";
import { hash } from "bcrypt";

export async function signUp(username: string, password: string, email: string) {
  try {
    // Hash password before storing
    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email,
        username: username,
        password: hashedPassword,
      },
    });
    return user;
  } catch (error: any) {
    console.error("SignUp Error:", error.message);
    throw error;
  }
}