import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const COLORS = ['red', 'orange', 'amber', 'green', 'emerald', 'sky', 'blue', 'violet', 'pink'];

export class CreateTaskDto {
  @ApiProperty({ example: 'Diseñar el flujo de login' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['backend', 'auth'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsIn(COLORS, { each: true, message: 'Label inválido' })
  labels?: string[];

  @ApiPropertyOptional({ example: '2026-09-30T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'uuid-de-miembro' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export const TASK_LABELS = COLORS;