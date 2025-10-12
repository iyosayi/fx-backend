import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName?: string;
}

