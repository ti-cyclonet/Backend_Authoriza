import { Controller, Get, Post, Body, Param, Delete, Put, Request } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { TransferAdminRoleDto } from './dto/transfer-admin-role.dto';

@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post()
  create(@Body() createUserRoleDto: CreateUserRoleDto) {
    return this.userRolesService.create(createUserRoleDto);
  }

  @Post('assign')
  assignRole(@Body() createUserRoleDto: CreateUserRoleDto) {
    return this.userRolesService.assignRole(createUserRoleDto);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.userRolesService.findByUser(userId);
  }

  @Get('availability/:contractId')
  getRoleAvailability(@Param('contractId') contractId: string) {
    return this.userRolesService.getRoleAvailability(contractId);
  }

  @Get('assigned-count/:contractId/:roleId')
  getAssignedCount(
    @Param('contractId') contractId: string,
    @Param('roleId') roleId: string
  ) {
    return this.userRolesService.getAssignedCountByContractAndRole(contractId, roleId);
  }

  @Get()
  findAll() {
    return this.userRolesService.findAll();
  }

  @Delete(':userId/:roleId')
  remove(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userRolesService.removeRole(userId, roleId);
  }

  @Delete('unassign/:userId/:roleId')
  unassignRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userRolesService.removeRole(userId, roleId);
  }

  @Post('transfer-admin')
  transferAdminRole(@Request() req, @Body() dto: TransferAdminRoleDto) {
    return this.userRolesService.transferAdminRole(req.user.id, dto.newAdminEmail, dto.contractId);
  }
}