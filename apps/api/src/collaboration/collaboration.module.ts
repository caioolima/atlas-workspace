import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { CollaborationGateway } from './collaboration.gateway';

@Module({
  imports: [AuthModule, DocumentsModule],
  providers: [CollaborationGateway],
})
export class CollaborationModule {}
