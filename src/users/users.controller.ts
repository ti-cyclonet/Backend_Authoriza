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
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  Delete,
  BadRequestException,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
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
  @ApiOperation({ summary: 'Create full user with nested data' })
  async createFullUser(@Body() dto: CreateFullUserDto) {
    const user = await this.usersService.create(dto.user);
    const basicData = await this.basicDataService.create(
      user.id,
      dto.basicData,
    );

    if (dto.basicData.strPersonType === 'N' && dto.naturalPersonData) {
      await this.naturalPersonService.create({
        ...dto.naturalPersonData,
        basicDataId: basicData.id,
      });
    }

    if (dto.basicData.strPersonType === 'J' && dto.legalEntityData) {
      await this.legalEntityService.create({
        ...dto.legalEntityData,
        basicDataId: basicData.id,
      });
    }

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

  @Get('check-username/:userName')
  @ApiOperation({ summary: 'Check if a username is taken' })
  async checkUsername(@Param('userName') userName: string) {
    const isTaken = await this.usersService.isUserNameTaken(userName);
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
