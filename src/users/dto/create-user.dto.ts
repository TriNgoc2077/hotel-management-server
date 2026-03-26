import { IsString, IsEmail, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  roleId: string;

  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MaxLength(255)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsIn(['Active', 'Locked'])
  status: string;
}
