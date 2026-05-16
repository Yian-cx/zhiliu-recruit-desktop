import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            nickname: true,
            avatarUrl: true,
            role: true,
            membershipTier: true,
            membershipExpiresAt: true,
            phone: true,
            wechat: true,
            qq: true,
            passwordHash: true,
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
          image: user.avatarUrl,
          role: user.role,
          membershipTier: user.membershipTier,
          membershipExpiresAt: user.membershipExpiresAt,
          phone: user.phone,
          wechat: user.wechat,
          qq: user.qq,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.membershipTier = user.membershipTier || "FREE";
        token.membershipExpiresAt = user.membershipExpiresAt?.toISOString?.() || null;
        token.phone = user.phone || null;
        token.wechat = user.wechat || null;
        token.qq = user.qq || null;
        token.name = user.name;
        token.picture = user.image;
      }
      // Always refresh from DB so profile changes take effect without re-login
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { nickname: true, avatarUrl: true, role: true, membershipTier: true, membershipExpiresAt: true, phone: true, wechat: true, qq: true },
        });
        if (dbUser) {
          token.name = dbUser.nickname;
          token.picture = dbUser.avatarUrl;
          token.role = dbUser.role;
          token.membershipTier = dbUser.membershipTier;
          token.membershipExpiresAt = dbUser.membershipExpiresAt?.toISOString?.() || null;
          token.phone = dbUser.phone || null;
          token.wechat = dbUser.wechat || null;
          token.qq = dbUser.qq || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).membershipTier = token.membershipTier;
        (session.user as any).membershipExpiresAt = token.membershipExpiresAt;
        (session.user as any).phone = token.phone || null;
        (session.user as any).wechat = token.wechat || null;
        (session.user as any).qq = token.qq || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
