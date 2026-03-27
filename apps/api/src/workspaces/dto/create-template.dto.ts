import { TemplateCategory } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BlockType } from '@prisma/client';

class TemplateBlockDto {
  @IsEnum(BlockType)
  type!: BlockType;

  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(TemplateCategory)
  category!: TemplateCategory;

  @IsString()
  @MaxLength(280)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateBlockDto)
  blocks!: TemplateBlockDto[];
}
