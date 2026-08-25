import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { BoardMemberRole } from '@kanban/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: 'otro@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: BoardMemberRole, default: BoardMemberRole.MEMBER })
  @IsOptional()
  @IsEnum(BoardMemberRole)
  role?: BoardMemberRole;
}