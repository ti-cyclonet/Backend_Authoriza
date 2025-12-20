import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { QueryAssistantDto } from './dto/assistant.dto';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @ApiOperation({ summary: 'Process assistant query' })
  @Post('query')
  async processQuery(@Body() queryDto: QueryAssistantDto) {
    return this.assistantService.processQuery(queryDto);
  }

  @ApiOperation({ summary: 'Get session chat history' })
  @Get('history')
  async getHistory(
    @Query('sessionId') sessionId: string,
    @Query('module') module: string,
  ) {
    return this.assistantService.getSessionHistory(sessionId, module);
  }
}