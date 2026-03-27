import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePublicShareDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;
}
