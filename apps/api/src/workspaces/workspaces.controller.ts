import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { SafeUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { WorkspacesService } from './workspaces.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  listWorkspaces(@CurrentUser() user: SafeUser) {
    return this.workspacesService.listWorkspaces(user.id);
  }

  @Post('onboarding')
  completeOnboarding(
    @CurrentUser() user: SafeUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.workspacesService.completeOnboarding(user.id, dto);
  }

  @Patch('invites/:token/accept')
  acceptInvite(@CurrentUser() user: SafeUser, @Param('token') token: string) {
    return this.workspacesService.acceptInvite(token, user.id);
  }

  @Get(':id')
  getWorkspace(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.workspacesService.getWorkspaceOverview(id, user.id);
  }

  @Patch(':id')
  updateWorkspace(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateWorkspace(id, user.id, dto);
  }

  @Get(':id/members')
  listMembers(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.workspacesService.listMembers(id, user.id);
  }

  @Post(':id/invites')
  inviteMember(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.inviteMember(id, user.id, dto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.workspacesService.updateMember(id, user.id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(id, user.id, memberId);
  }

  @Get(':id/templates')
  listTemplates(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.workspacesService.listTemplates(id, user.id);
  }

  @Post(':id/templates')
  createTemplate(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.workspacesService.createTemplate(id, user.id, dto);
  }

  @Post(':id/templates/:templateId/apply')
  applyTemplate(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('templateId') templateId: string,
    @Body() dto: ApplyTemplateDto,
  ) {
    return this.workspacesService.applyTemplate(id, templateId, user.id, dto);
  }

  @Get(':id/analytics')
  getAnalytics(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.workspacesService.getAnalytics(id, user.id);
  }

  @Get(':id/activity')
  getActivity(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.workspacesService.getActivity(id, user.id);
  }
}
