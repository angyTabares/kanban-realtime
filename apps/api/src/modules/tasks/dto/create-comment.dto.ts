import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Listo para revisión' })
  @IsString()
  @MaxLength(2000)
  body: string;
}