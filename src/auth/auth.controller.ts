import { Controller, Post, Body, Request, UseGuards, Get, Query, Res, Header } from '@nestjs/common';
import { Response } from 'express';
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
  @Header('Content-Type', 'text/html')
  async verifyRegistrationViaLink(@Query('email') email: string, @Query('code') code: string, @Res() res: Response) {
    let result: any;
    try {
      result = await this.selfRegistrationService.verifyRegistration({ email, code });
    } catch (err) {
      result = { success: false, message: err.message || 'Error de verificación', contractActivated: false };
    }
    
    const isSuccess = result.success && result.contractActivated;
    const isPending = result.success && !result.contractActivated;
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSuccess ? '¡Cuenta verificada!' : 'Verificación'} - InOut</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 16px; padding: 2.5rem; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #333; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5; }
    .info-box { background: #f8f8f8; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; text-align: left; }
    .info-box p { margin: 0.3rem 0; font-size: 0.85rem; }
    .info-box strong { color: #333; }
    .info-box code { background: #eee; padding: 2px 6px; border-radius: 3px; font-size: 0.9rem; }
    .btn { display: inline-block; padding: 0.75rem 2rem; background: #ff7000; color: white; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 0.95rem; margin-top: 1rem; transition: background 0.2s; }
    .btn:hover { background: #e65c00; }
    .pending-msg { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .pending-msg p { color: #856404; margin: 0; font-size: 0.88rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? '✅' : isPending ? '📧' : '⚠️'}</div>
    <h1>${isSuccess ? '¡Cuenta activada!' : isPending ? '¡Email verificado!' : (result.message || 'Error')}</h1>
    ${isSuccess ? `
    <p>Tu contrato ha sido activado exitosamente. Ya puedes iniciar sesión en InOut.</p>
    <div class="info-box">
      <p><strong>Plan:</strong> ${result.data?.packageName || ''}</p>
      <p><strong>Contrato:</strong> ${result.data?.contractCode || ''}</p>
      ${result.data?.endDate ? `<p><strong>Válido hasta:</strong> ${new Date(result.data.endDate).toLocaleDateString('es-CO')}</p>` : ''}
      <p><strong>Contraseña temporal:</strong> <code>1234567890</code></p>
    </div>
    <a href="${result.loginUrl || 'https://inout.cyclonet.com.co'}" class="btn">Ir a InOut →</a>
    ` : isPending ? `
    <p>${result.message}</p>
    <div class="info-box">
      <p><strong>Plan:</strong> ${result.data?.packageName || ''}</p>
      <p><strong>Contrato:</strong> ${result.data?.contractCode || ''}</p>
    </div>
    ` : `
    <p>Verifica que el enlace sea correcto o solicita uno nuevo.</p>
    `}
  </div>
</body>
</html>`;

    res.send(html);
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

  @ApiOperation({ summary: 'Upgrade plan for existing user' })
  @Public()
  @Post('upgrade-plan')
  async upgradePlan(@Body() body: { email: string; password: string; packageId: string }) {
    return this.selfRegistrationService.upgradePlan(body.email, body.password, body.packageId);
  }
}
