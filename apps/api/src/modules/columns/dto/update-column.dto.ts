import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateColumnDto {
  @ApiPropertyOptional({ example: 'Revisión' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional({ example: '#10b981' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
}