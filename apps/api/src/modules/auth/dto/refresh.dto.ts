import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token emitido en login/register' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ip?: string;
}