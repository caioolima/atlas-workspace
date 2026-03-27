import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import type { SafeUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createCheckoutSession(user: SafeUser) {
    const stripe = this.getStripe();
    const priceId = this.configService.get<string>('STRIPE_PRICE_ID_PRO');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (!priceId) {
      throw new ServiceUnavailableException(
        'Configure STRIPE_PRICE_ID_PRO para testar o checkout.',
      );
    }

    const customerId = await this.getOrCreateCustomer(user, stripe);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
      },
      success_url: `${frontendUrl}/dashboard?billing=success`,
      cancel_url: `${frontendUrl}/dashboard?billing=cancelled`,
    });

    return {
      url: session.url,
    };
  }

  async createCustomerPortal(user: SafeUser) {
    const stripe = this.getStripe();
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!currentUser?.stripeCustomerId) {
      throw new ServiceUnavailableException(
        'Nenhum cliente Stripe encontrado para este usuário.',
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: currentUser.stripeCustomerId,
      return_url: `${frontendUrl}/dashboard`,
    });

    return {
      url: session.url,
    };
  }

  async handleWebhook(signature: string | undefined, rawBody: Buffer) {
    const stripe = this.getStripe();
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        const userId = session.metadata?.userId;

        if (userId && typeof session.customer === 'string') {
          await this.prisma.user.update({
            where: {
              id: userId,
            },
            data: {
              stripeCustomerId: session.customer,
            },
          });
        }

        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          await this.syncSubscription(subscription, userId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await this.syncSubscription(subscription);
        break;
      }

      default:
        break;
    }

    return {
      received: true,
    };
  }

  async getBillingSummary(userId: string) {
    const [user, workspaceMemberships, documents, uploads] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          subscription: true,
        },
      }),
      this.prisma.workspaceMember.findMany({
        where: {
          userId,
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.document.count({
        where: {
          workspace: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      }),
      this.prisma.upload.count({
        where: {
          workspace: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      }),
    ]);

    return {
      customerId: user?.stripeCustomerId ?? null,
      plan: user?.subscription?.plan ?? SubscriptionPlan.FREE,
      status: user?.subscription?.status ?? SubscriptionStatus.INACTIVE,
      currentPeriodEnd: user?.subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: user?.subscription?.cancelAtPeriodEnd ?? false,
      usage: {
        workspaces: workspaceMemberships.length,
        documents,
        uploads,
      },
      workspaces: workspaceMemberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
      })),
      plans: [
        {
          id: 'starter',
          name: 'Starter',
          price: 'R$ 0',
          description: 'Workspace inicial para validar processos e templates.',
          highlighted: false,
        },
        {
          id: 'team',
          name: 'Team',
          price: 'R$ 79',
          description:
            'IA, aprovações, colaboração e billing para times em operação.',
          highlighted: true,
        },
        {
          id: 'agency',
          name: 'Agency',
          price: 'R$ 199',
          description:
            'Mais governança, histórico e multi-cliente para operações maduras.',
          highlighted: false,
        },
      ],
    };
  }

  private async syncSubscription(
    subscription: Stripe.Subscription,
    fallbackUserId?: string,
  ) {
    const user =
      (fallbackUserId
        ? await this.prisma.user.findUnique({
            where: {
              id: fallbackUserId,
            },
          })
        : null) ||
      (typeof subscription.customer === 'string'
        ? await this.prisma.user.findFirst({
            where: {
              stripeCustomerId: subscription.customer,
            },
          })
        : null) ||
      (await this.prisma.user.findFirst({
        where: {
          subscription: {
            stripeSubscriptionId: subscription.id,
          },
        },
      }));

    if (!user) {
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;

    await this.prisma.subscription.upsert({
      where: {
        userId: user.id,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan: this.mapPlan(priceId),
        status: this.mapStatus(subscription.status),
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        plan: this.mapPlan(priceId),
        status: this.mapStatus(subscription.status),
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private mapPlan(priceId?: string | null) {
    const proPriceId = this.configService.get<string>('STRIPE_PRICE_ID_PRO');

    if (priceId && proPriceId && priceId === proPriceId) {
      return SubscriptionPlan.PRO;
    }

    return SubscriptionPlan.PRO;
  }

  private mapStatus(status: Stripe.Subscription.Status) {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  private async getOrCreateCustomer(user: SafeUser, stripe: Stripe) {
    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (currentUser?.stripeCustomerId) {
      return currentUser.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        userId: user.id,
      },
    });

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  private getStripe() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Configure STRIPE_SECRET_KEY para habilitar billing.',
      );
    }

    return new Stripe(secretKey);
  }
}
