import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Patch,
  Put,
  Request,
  Res,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  Delete,
  BadRequestException,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from './dto/pagination.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { CreateFullUserDto } from './dto/CreateFullUserDto';
import { BasicDataService } from 'src/basic-data/basic-data.service';
import { NaturalPersonDataService } from 'src/natural-person-data/natural-person-data.service';
import { LegalEntityDataService } from 'src/legal-entity-data/legal-entity-data.service';
import { IndependentUsersDto } from 'src/common/dtos/independent-user.dto';
import { PaginatedResponse } from 'src/common/dtos/paginated-response';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly basicDataService: BasicDataService,
    private readonly naturalPersonService: NaturalPersonDataService,
    private readonly legalEntityService: LegalEntityDataService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post('full')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Create full user with nested data including document type' })
  async createFullUser(@Body() dto: CreateFullUserDto) {
    const user = await this.usersService.createFullUser(dto);
    return {
      id: user.id,
      message: 'User created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users, optionally including soft-deleted' })
  async findAll(
    @Query() findUsersDto: FindUsersDto,
  ): Promise<UserResponseDto[]> {
    const { dependentOnId, withDeleted, ...pagination } = findUsersDto;

    const includeDeleted = withDeleted === 'true';
    const users = await this.usersService.findAll(
      pagination,
      dependentOnId,
      includeDeleted,
    );

    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email with code' })
  async verifyEmail(
    @Query('email') email: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    let title: string;
    let message: string;
    let icon: string;
    let color: string;

    try {
      await this.usersService.verifyEmail(email, code);
      title = '¡Verificación exitosa!';
      message = 'Tu correo electrónico ha sido verificado correctamente. Se ha creado tu usuario en la suite <strong>CycloNet</strong> para usar la aplicación <strong><span style="color:#1565c0;">In</span><span style="color:#e65100;">Out</span></strong>.';
      icon = '✅';
      color = '#2e7d32';
    } catch (err) {
      title = 'Verificación fallida';
      message = err.message || 'No se pudo verificar tu correo electrónico.';
      icon = '❌';
      color = '#c62828';
    }

    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:500px;width:90%;text-align:center;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a237e,#0d47a1);padding:30px;">
      <img src="https://res.cloudinary.com/dn8ki4idz/image/upload/v1774391294/branding/cyclonet_logo.png" alt="CycloNet" style="max-width:160px;" />
    </div>
    <div style="padding:40px 30px;">
      <div style="font-size:64px;margin-bottom:16px;">${icon}</div>
      <h1 style="color:${color};margin:0 0 16px;font-size:24px;">${title}</h1>
      <p style="color:#333;line-height:1.7;font-size:15px;">${message}</p>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">
      <p style="color:#888;font-size:14px;">Cierre esta ventana para finalizar.</p>
    </div>
    <div style="background:#1a237e;padding:16px;">
      <p style="color:#bbdefb;margin:0;font-size:12px;">&copy; ${new Date().getFullYear()} CycloNet S.A.S. — Todos los derechos reservados</p>
    </div>
  </div>
</body>
</html>`);
  }

  @Post(':id/send-verification')
  @ApiOperation({ summary: 'Send verification email to user' })
  async sendVerification(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.sendVerificationEmail(id);
    return { message: 'Verification email sent' };
  }

  @Get('check-username/:userName')
  @ApiOperation({ summary: 'Check if a username is taken' })
  async checkUsername(@Param('userName') userName: string) {
    const isTaken = await this.usersService.isUserNameTaken(userName);
    return { available: !isTaken };
  }

  @Get('check-company-code/:companyCode')
  @ApiOperation({ summary: 'Check if a company code is taken' })
  async checkCompanyCode(@Param('companyCode') companyCode: string) {
    const isTaken = await this.usersService.isCompanyCodeTaken(companyCode);
    return { available: !isTaken };
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get user by email (with soft-deleted included)' })
  async findByEmail(@Param('email') email: string): Promise<UserResponseDto> {
    const user = await this.usersService.findByEmail(email);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Get('without-dependency/:id')
  @ApiOperation({
    summary: 'List users excluding the one this user depends on',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async getUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeDeleted') includeDeleted: boolean,
  ) {
    return this.usersService.findAllExcludingUserThatThisUserDependsOn(
      id,
      includeDeleted,
    );
  }

  @Get('independent')
  @ApiOperation({ summary: 'Get all users without dependency' })
  async findIndependentUsers(
    @Query('withDeleted', new DefaultValuePipe(false)) withDeleted: boolean,
  ): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAllWithoutDependency(withDeleted);

    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/assign-role')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiBody({ schema: { example: { roleId: 'uuid-of-role' } } })
  assignRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.usersService.assignRole(id, body.roleId);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      id,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user data' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    console.log(`PUT /users/${id} - Updating user with data:`, JSON.stringify(dto, null, 2));
    return this.usersService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle user status between ACTIVE and INACTIVE' })
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Patch(':id/status-with-dependents')
  @ApiOperation({ summary: 'Update status for user and its dependents' })
  async updateStatusAndDependents(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const allowedStatuses = [
      'ACTIVE',
      'INACTIVE',
      'UNCONFIRMED',
      'EXPIRING',
      'SUSPENDED',
      'DELINQUENT',
    ];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid status provided');
    }
    return this.usersService.updateStatusWithDependents(id, status);
  }

  @Delete(':userId/roles')
  @ApiOperation({ summary: 'Remove role from user' })
  async removeUserRole(@Param('userId') userId: string) {
    const updatedUser = await this.usersService.removeRole(userId);
    return { message: 'Role removed successfully', user: updatedUser };
  }

  @Patch(':id/remove-dependency')
  @ApiOperation({ summary: 'Remove dependency relation from a user' })
  @ApiResponse({ status: 200, description: 'Dependency removed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeUserDependency(@Param('id') id: string) {
    return this.usersService.removeDependency(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a user' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('force') force: string,
  ) {
    const forceFlag = force === 'true';
    return this.usersService.remove(id, forceFlag);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.restore(id);
  }

  @Patch(':id/restore-with-dependents')
  @ApiOperation({ summary: 'Restore a soft-deleted user and its dependents' })
  async restoreWithDependents(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.restore(id);
    await this.usersService.restoreDependents(id);
    return { message: `User '${id}' and dependents have been restored.` };
  }
}
