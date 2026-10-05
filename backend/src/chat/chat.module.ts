import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RealtimeGateway } from './chat.gateway';

@Module({
  controllers: [ChatController],
  providers: [ChatService, RealtimeGateway],
  exports: [ChatService, RealtimeGateway],
})
export class ChatModule {}
