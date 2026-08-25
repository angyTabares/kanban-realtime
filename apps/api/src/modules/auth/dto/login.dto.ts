import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cret!Password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  ip?: string;
}