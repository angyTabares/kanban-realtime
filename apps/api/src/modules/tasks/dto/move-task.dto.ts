import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsUUID } from 'class-validator';

export class MoveTaskDto {
  @ApiProperty({ example: 'uuid-columna-destino' })
  @IsUUID()
  targetColumnId: string;

  @ApiProperty({ example: 0, description: 'Índice destino dentro de la columna' })
  @IsNumber()
  position: number;
}

export class ReorderTasksDto {
  @ApiProperty({
    type: [String],
    example: ['uuid-tarea-1', 'uuid-tarea-2'],
    description: 'Ids ordenados dentro de una columna',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  orderedTaskIds: string[];
}