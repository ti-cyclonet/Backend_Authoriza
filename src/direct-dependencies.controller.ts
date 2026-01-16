import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('api/user-dependencies')
export class DirectUserDependenciesController {
  private static deps: any[] = [];

  constructor() {
    console.log('🚀 DirectUserDependenciesController INITIALIZED');
    console.log('📍 Controller route: api/user-dependencies');
  }

  @Post()
  create(@Body() body: any) {
    console.log('📥 POST /api/user-dependencies called with body:', body);
    const dep = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date()
    };
    DirectUserDependenciesController.deps.push(dep);
    console.log('✅ Created dependency:', dep);
    console.log('📊 Total dependencies:', DirectUserDependenciesController.deps.length);
    return dep;
  }

  @Get()
  getAll() {
    console.log('📥 GET /api/user-dependencies called');
    console.log('📊 Returning', DirectUserDependenciesController.deps.length, 'dependencies');
    return DirectUserDependenciesController.deps;
  }

  @Get('principal/:id')
  getByPrincipal(@Param('id') id: string) {
    console.log('📥 GET /api/user-dependencies/principal/' + id + ' called');
    const result = DirectUserDependenciesController.deps.filter(d => d.principalUserId === id);
    console.log('📊 Found', result.length, 'dependencies for principal:', id);
    return result;
  }
}