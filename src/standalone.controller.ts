import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('user-dependencies')
export class StandaloneController {
  private deps: any[] = [];

  @Post()
  createDep(@Body() body: any) {
    const dep = {
      id: Date.now().toString(),
      principalUserId: body.principalUserId,
      dependentUserId: body.dependentUserId,
      status: body.status || 'ACTIVE',
      createdAt: new Date()
    };
    this.deps.push(dep);
    return dep;
  }

  @Get()
  getAllDeps() {
    return this.deps;
  }

  @Get('principal/:id')
  getByPrincipal(@Param('id') id: string) {
    return this.deps.filter(d => d.principalUserId === id);
  }
}