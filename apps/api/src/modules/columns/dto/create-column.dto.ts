import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ example: 'En progreso' })
  @IsString()
  @MaxLength(80)
  title: string;

  @ApiPropertyOptional({ example: '#f59e0b' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  color?: string;

  @ApiPropertyOptional({ example: '2', description: 'Posición opcional; por defecto va al final' })
  @IsOptional()
  @IsString()
  position?: string;
}