import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      service: 'notion-ai-collab-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
