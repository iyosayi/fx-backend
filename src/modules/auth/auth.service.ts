import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppException } from '../../common/filters/http-exception.filter';
import { JWT_CONFIG } from '../../config/constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new AppException(409, 'DUPLICATE_EMAIL', 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userModel.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with password
    const user = await this.userModel.findOne({ email }).select('+passwordHash');

    if (!user) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken) as {
        userId: string;
        email: string;
      };

      const user = await this.userModel.findById(decoded.userId);

      if (!user) {
        throw new AppException(401, 'INVALID_TOKEN', 'Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new AppException(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }
  }

  private generateTokens(user: UserDocument) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string): Promise<UserDocument> {
    return this.userModel.findById(userId);
  }

  async getCurrentUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new AppException(404, 'USER_NOT_FOUND', 'User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    };
  }

  async logout() {
    // For JWT-based auth, logout is handled client-side by removing the token
    // This endpoint can be used for audit logging or future token blacklisting
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}

