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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from './dto/pagination.dto';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { CreateFullUserDto } from './dto/CreateFullUserDto';
import { BasicDataService } from 'src/basic-data/basic-data.service';
import { NaturalPersonDataService } from 'src/natural-person-data/natural-person-data.service';
import { LegalEntityDataService } from 'src/legal-entity-data/legal-entity-data.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly basicDataService: BasicDataService,
    private readonly naturalPersonService: NaturalPersonDataService,
    private readonly legalEntityService: LegalEntityDataService,
  ) {}

  @ApiOperation({ summary: 'Create an user' })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post('full')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createFullUser(@Body() dto: CreateFullUserDto) {
    // console.log('Creating full user with data:', dto);
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

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  async findAll(
    @Query() findUsersDto: FindUsersDto,
  ): Promise<UserResponseDto[]> {
    const { dependentOnId, ...pagination } = findUsersDto;
    const users = await this.usersService.findAll(pagination, dependentOnId);
    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }

  @Get('check-username/:userName')
  async checkUsername(@Param('userName') userName: string) {
    const isTaken = await this.usersService.isUserNameTaken(userName);
    return { available: !isTaken };
  }

  @ApiOperation({ summary: 'Get user by id' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @ApiOperation({ summary: 'Get user by email' })
  @Get('email/:email')
  async findByEmail(@Param('email') email: string): Promise<UserResponseDto> {
    const user = await this.usersService.findByEmail(email);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Get('without-dependency/:id')
  @ApiOperation({
    summary: 'List all users excluding the user that the given user depends on',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID of the user to evaluate',
  })
  getUsers(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findAllExcludingUserThatThisUserDependsOn(id);
  }

  @ApiOperation({ summary: 'Assign a role to user' })
  @ApiBody({ schema: { example: { roleId: 'uuid-of-role' } } })
  @Post(':id/assign-role')
  assignRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.usersService.assignRole(id, body.roleId);
  }

  @ApiOperation({ summary: 'Change password' })
  @Post(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      id,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Delete(':userId/roles')
  async removeUserRole(@Param('userId') userId: string) {
    const updatedUser = await this.usersService.removeRole(userId);
    return { message: 'Role removed successfully', user: updatedUser };
  }
}
