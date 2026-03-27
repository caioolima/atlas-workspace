import {
  AuthProvider,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';

export type SafeUser = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  provider: AuthProvider;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
};

export type TokenPayload = {
  sub: string;
  email: string;
  sessionId?: string;
};

export type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};
