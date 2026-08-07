"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/config/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sendMail } from "@/lib/email/mailer";
import { randomToken, sha256Hex } from "@/lib/crypto/encryption";

const credsSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  name: z.string().min(1).optional(),
});

export interface ActionState {
  error?: string;
}

async function clientMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };

  const meta = await clientMeta();
  // Brute-force / abuse protection on account creation (§70).
  if (!(await checkRateLimit(`register:${meta.ip}`, 10, 3600))) {
    return { error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Bu e-posta zaten kayıtlı." };

  const passwordHash = await hashPassword(parsed.data.password);
  const isSuperAdmin = getEnv().INITIAL_ADMIN_EMAIL?.toLowerCase() === email; // §140

  const user = await prisma.user.create({
    data: { email, passwordHash, name: parsed.data.name, isSuperAdmin },
  });

  // Issue an email verification token (§6). Delivery via configured provider (console in dev).
  const token = randomToken(24);
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      email,
      tokenHash: sha256Hex(token),
      purpose: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  await sendMail({
    to: email,
    subject: "E-postanı doğrula",
    text: `Hesabını doğrulamak için: ${getEnv().NODE_ENV === "production" ? "" : "(dev) "}/verify-email?token=${token}`,
  });

  await createSession(user.id, meta);
  redirect("/onboarding");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credsSchema
    .pick({ email: true, password: true })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Geçersiz e-posta veya şifre." };

  const meta = await clientMeta();
  // Login rate-limit keyed by email+ip (§70).
  if (!(await checkRateLimit(`login:${meta.ip}:${parsed.data.email}`, 8, 900))) {
    return { error: "Çok fazla başarısız deneme. Lütfen biraz bekleyin." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Constant-ish work whether or not the user exists.
  const ok = user ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  if (!user || !ok) return { error: "E-posta veya şifre hatalı." };

  await createSession(user.id, meta);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
