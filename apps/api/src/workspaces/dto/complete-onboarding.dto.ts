import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiTone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  brandColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateId?: string;
}
