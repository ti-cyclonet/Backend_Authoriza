import { IsString, IsOptional, IsArray } from 'class-validator';

export class QueryAssistantDto {
  @IsString()
  sessionId: string;

  @IsString()
  module: string;

  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  context?: any;
}

export class AssistantResponseDto {
  response: string;
  suggestions: string[];
  actions: AssistantAction[];
}

export interface AssistantAction {
  type: 'navigate' | 'create' | 'filter' | 'help';
  label: string;
  data?: any;
}