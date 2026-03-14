import { SetMetadata } from '@nestjs/common';
import { RESOURCE_TYPE_KEY } from '../guards/usage-limit.guard';

export const ResourceType = (type: 'product' | 'user' | 'invoice') => 
  SetMetadata(RESOURCE_TYPE_KEY, type);
