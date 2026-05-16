import { DefaultSession, DefaultUser } from "next-auth";
import { MembershipTier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      membershipTier: MembershipTier;
      membershipExpiresAt: string | null;
      phone: string | null;
      wechat: string | null;
      qq: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    membershipTier: MembershipTier;
    membershipExpiresAt: Date | null;
    phone: string | null;
    wechat: string | null;
    qq: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    membershipTier: MembershipTier;
    membershipExpiresAt: string | null;
    phone: string | null;
    wechat: string | null;
    qq: string | null;
  }
}
