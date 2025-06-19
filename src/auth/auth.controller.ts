import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login user and return access token' })

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ access_token: string; user: AuthenticatedUser }> {
    return this.authService.validateUser(loginDto);
  }
  @ApiOperation({ summary: 'Get user profile' })
  @Post('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}