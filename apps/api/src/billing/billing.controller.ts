import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { SafeUser } from '../auth/auth.types';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  getBillingSummary(@CurrentUser() user: SafeUser) {
    return this.billingService.getBillingSummary(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout-session')
  createCheckoutSession(@CurrentUser() user: SafeUser) {
    return this.billingService.createCheckoutSession(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-portal')
  createCustomerPortal(@CurrentUser() user: SafeUser) {
    return this.billingService.createCustomerPortal(user);
  }

  @HttpCode(200)
  @Post('webhook')
  handleWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: Request & { rawBody?: Buffer },
  ) {
    const rawBody =
      request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));

    return this.billingService.handleWebhook(signature, rawBody);
  }
}
