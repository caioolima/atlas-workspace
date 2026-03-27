import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { PublicSharesModule } from './public-shares/public-shares.module';
import { UploadsModule } from './uploads/uploads.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    WorkspacesModule,
    AuthModule,
    DocumentsModule,
    PublicSharesModule,
    AiModule,
    UploadsModule,
    BillingModule,
    CollaborationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
