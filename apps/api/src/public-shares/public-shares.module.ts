import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { PublicSharesController } from './public-shares.controller';

@Module({
  imports: [DocumentsModule],
  controllers: [PublicSharesController],
})
export class PublicSharesModule {}
