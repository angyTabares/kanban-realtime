import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Maria López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'S3cret!Password' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
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