import { Controller, Get, Post, Body, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '../auth/roles.enum';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(@Query('orderId') orderId: string) {
    return this.chatService.getMessages(orderId || 'KFD-0511-01');
  }

  @Post('send')
  async sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    if (req?.user && req.user.role !== Role.ADMIN && req.user.role !== dto.senderRole) {
      throw new ForbiddenException(
        'Role pengirim pesan tidak sesuai dengan kredensial token aktif'
      );
    }
    return this.chatService.sendMessage(dto);
  }
}

