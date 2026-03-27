import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { SafeUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { SyncDocumentDto } from './dto/sync-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  listDocuments(
    @CurrentUser() user: SafeUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.documentsService.listDocuments(user.id, workspaceId);
  }

  @Post()
  createDocument(
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.createDocument(user.id, dto);
  }

  @Get(':id')
  getDocument(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.documentsService.getDocument(id, user.id);
  }

  @Patch(':id')
  updateDocument(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, user.id, dto);
  }

  @Put(':id/blocks')
  syncDocument(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: SyncDocumentDto,
  ) {
    return this.documentsService.syncBlocks(id, user.id, dto.blocks, dto.title);
  }

  @Post(':id/share')
  shareDocument(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: ShareDocumentDto,
  ) {
    return this.documentsService.shareDocument(id, user.id, dto);
  }

  @Post(':id/comments')
  addComment(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.documentsService.addComment(id, user.id, dto);
  }

  @Post(':id/approvals')
  requestApproval(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: CreateApprovalDto,
  ) {
    return this.documentsService.requestApproval(id, user.id, dto);
  }

  @Patch(':id/approvals/:approvalId')
  reviewApproval(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ReviewApprovalDto,
  ) {
    return this.documentsService.reviewApproval(id, approvalId, user.id, dto);
  }

  @Get(':id/versions')
  listVersions(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.documentsService.listVersions(id, user.id);
  }

  @Post(':id/versions/:versionId/restore')
  restoreVersion(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.documentsService.restoreVersion(id, versionId, user.id);
  }

  @Post(':id/public-share')
  createPublicShare(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: CreatePublicShareDto,
  ) {
    return this.documentsService.createPublicShare(id, user.id, dto);
  }

  @Delete(':id/public-share/:shareId')
  revokePublicShare(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    return this.documentsService.revokePublicShare(id, shareId, user.id);
  }

  @Get(':id/activity')
  getActivity(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.documentsService.getDocumentActivity(id, user.id);
  }
}
