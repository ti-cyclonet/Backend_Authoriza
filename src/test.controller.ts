import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  constructor() {
    console.log('TestController CREATED');
  }

  @Get()
  test() {
    console.log('TEST GET called');
    return { message: 'working' };
  }
}