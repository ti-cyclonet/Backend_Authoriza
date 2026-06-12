import { Controller, Post, Body, Request, UseGuards, Get, Query } from '@nestjs/common';
import { AuthenticatedUser, AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SelfRegisterDto, VerifyRegistrationDto } from './dto/self-register.dto';
import { SelfRegistrationService } from './self-registration.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly selfRegistrationService: SelfRegistrationService,
  ) {}

  @ApiOperation({ summary: 'Login user and return access token' })
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ access_token: string; user: AuthenticatedUser } | { status: string; message: string }> {
    return this.authService.validateUser(loginDto);
  }

  @ApiOperation({ summary: 'Auto login after email verification' })
  @Public()
  @Get('login-verified')
  async loginAfterVerification(@Query('email') email: string) {
    return this.authService.loginAfterVerification(email);
  }

  @ApiOperation({ summary: 'Complete login with selected contract' })
  @Public()
  @Post('login/complete')
  async completeLogin(
    @Body() body: { email: string; applicationName: string; contractId: string },
  ) {
    return this.authService.completeLoginWithContract(body.email, body.applicationName, body.contractId);
  }

  @ApiOperation({ summary: 'Get user profile' })
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @ApiOperation({ summary: 'Check if email exists in the system' })
  @Public()
  @Post('check-email')
  async checkEmail(@Body() body: { email: string }) {
    if (!body.email) {
      return { exists: false, message: 'Email requerido' };
    }
    const user = await this.authService.checkEmailExists(body.email);
    return {
      exists: !!user,
      message: user ? 'Este correo ya tiene una cuenta registrada.' : 'Email disponible.',
    };
  }

  @ApiOperation({ summary: 'Self-register a new account (principal + dependent)' })
  @Public()
  @Post('self-register')
  async selfRegister(@Body() dto: SelfRegisterDto) {
    return this.selfRegistrationService.register(dto);
  }

  @ApiOperation({ summary: 'Verify registration email with code' })
  @Public()
  @Post('verify-registration')
  async verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.selfRegistrationService.verifyRegistration(dto);
  }

  @ApiOperation({ summary: 'Verify registration via email link (GET)' })
  @Public()
  @Get('verify-registration')
  async verifyRegistrationViaLink(@Query('email') email: string, @Query('code') code: string) {
    const result = await this.selfRegistrationService.verifyRegistration({ email, code });
    // Redirect to InOut login after verification
    if (result.contractActivated) {
      return { 
        ...result,
        message: '¡Cuenta verificada exitosamente! Ya puedes iniciar sesión en InOut.',
      };
    }
    return result;
  }

  @ApiOperation({ summary: 'Resend verification code' })
  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.selfRegistrationService.resendVerificationCode(body.email);
  }

  @ApiOperation({ summary: 'Send contact form from landing' })
  @Public()
  @Post('contact')
  async contactForm(@Body() body: { name: string; email: string; phone?: string; subject?: string; message: string }) {
    return this.selfRegistrationService.sendContactEmail(body);
  }
}
