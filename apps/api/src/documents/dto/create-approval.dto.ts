import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reviewerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes?: string;
}
