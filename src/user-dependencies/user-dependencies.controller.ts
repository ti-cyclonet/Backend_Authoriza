import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { UserDependenciesService } from './user-dependencies.service';
import { CreateUserDependencyDto } from './dto/create-user-dependency.dto';

@Controller('user-dependencies')
export class UserDependenciesController {
  constructor(private readonly userDependenciesService: UserDependenciesService) {}

  @Post()
  create(@Body() createUserDependencyDto: CreateUserDependencyDto) {
    return this.userDependenciesService.create(createUserDependencyDto);
  }

  @Get()
  findAll() {
    return this.userDependenciesService.findAll();
  }

  @Get('principal/:principalUserId')
  findDependentsByPrincipal(@Param('principalUserId') principalUserId: string) {
    return this.userDependenciesService.findDependentsByPrincipal(principalUserId);
  }

  @Get('dependent/:dependentUserId')
  findPrincipalsByDependent(@Param('dependentUserId') dependentUserId: string) {
    return this.userDependenciesService.findPrincipalsByDependent(dependentUserId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.userDependenciesService.deactivate(id);
  }

  @Patch(':id/signer')
  updateSigner(@Param('id') id: string, @Body('isAuthorizedSigner') isAuthorizedSigner: boolean) {
    return this.userDependenciesService.updateSigner(id, isAuthorizedSigner);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userDependenciesService.remove(id);
  }
}