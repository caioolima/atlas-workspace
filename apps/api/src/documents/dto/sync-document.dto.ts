import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BlockType } from '@prisma/client';

export class BlockInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsEnum(BlockType)
  type!: BlockType;

  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  position?: number;
}

export class SyncDocumentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockInputDto)
  blocks!: BlockInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
