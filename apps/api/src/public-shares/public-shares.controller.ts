import { Controller, Get, Param } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';

@Controller('public-shares')
export class PublicSharesController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':token')
  getSharedDocument(@Param('token') token: string) {
    return this.documentsService.getPublicDocument(token);
  }
}
