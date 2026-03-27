import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const AI_ACTIONS = ['outline', 'rewrite', 'expand', 'brainstorm'] as const;

export class AiBlockContextDto {
  @IsString()
  @MaxLength(32)
  type!: string;

  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AssistDocumentDto {
  @IsIn(AI_ACTIONS)
  action!: (typeof AI_ACTIONS)[number];

  @IsString()
  @MaxLength(180)
  documentTitle!: string;

  @IsString()
  @MaxLength(1200)
  instruction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiBlockContextDto)
  blocks!: AiBlockContextDto[];
}
