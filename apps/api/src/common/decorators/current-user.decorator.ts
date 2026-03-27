import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SafeUser } from '../../auth/auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SafeUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: SafeUser }>();
    return request.user;
  },
);
