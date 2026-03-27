import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [DocumentsModule, WorkspacesModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
