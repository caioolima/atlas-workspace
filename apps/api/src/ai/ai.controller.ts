import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AssistDocumentDto } from './dto/assist-document.dto';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('assist')
  assistDocument(@Body() dto: AssistDocumentDto) {
    return this.aiService.assistDocument(dto);
  }
}
