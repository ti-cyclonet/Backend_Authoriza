import { Controller, Get, Post, Body, Param } from '@nestjs/common';

interface CreateDependencyDto {
  principalUserId: string;
  dependentUserId: string;
  status: string;
}

@Controller('api/user-dependencies')
export class SimpleUserDependenciesController {
  private static dependencies: any[] = [];

  @Post()
  create(@Body() createDto: CreateDependencyDto) {
    const dependency = {
      id: Date.now().toString(),
      ...createDto,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    SimpleUserDependenciesController.dependencies.push(dependency);
    console.log('Dependency created:', dependency);
    return dependency;
  }

  @Get()
  findAll() {
    return SimpleUserDependenciesController.dependencies;
  }

  @Get('principal/:principalUserId')
  findByPrincipal(@Param('principalUserId') principalUserId: string) {
    return SimpleUserDependenciesController.dependencies.filter(d => d.principalUserId === principalUserId);
  }
}