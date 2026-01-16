import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('api/user-dependencies')
export class TempUserDependenciesController {
  private dependencies: any[] = [];

  @Post()
  create(@Body() createDto: any) {
    const dependency = {
      id: Date.now().toString(),
      ...createDto,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dependencies.push(dependency);
    return dependency;
  }

  @Get()
  findAll() {
    return this.dependencies;
  }

  @Get('principal/:principalUserId')
  findByPrincipal(@Param('principalUserId') principalUserId: string) {
    return this.dependencies.filter(d => d.principalUserId === principalUserId);
  }
}