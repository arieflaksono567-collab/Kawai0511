import { Injectable } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';

export interface ChatMessage {
  id: string;
  orderId: string;
  orderType: 'RIDE' | 'FOOD' | 'DELIVERY';
  senderRole: 'CUSTOMER' | 'DRIVER';
  message: string;
  timestamp: string;
  isRead: boolean;
}

@Injectable()
export class ChatService {
  private messages: ChatMessage[] = [
    {
      id: 'msg-01',
      orderId: 'KFD-0511-01',
      orderType: 'FOOD',
      senderRole: 'CUSTOMER',
      message: 'Halo mang Ahmad, tolong sambal soto Banjarnya dipisah ya.',
      timestamp: '11:42 WITA',
      isRead: true,
    },
    {
      id: 'msg-02',
      orderId: 'KFD-0511-01',
      orderType: 'FOOD',
      senderRole: 'DRIVER',
      message: 'Siap kak, sudah saya sampaikan ke pihak resto Bang Amat. Ini sedang dimasak.',
      timestamp: '11:43 WITA',
      isRead: true,
    },
  ];

  async getMessages(orderId: string): Promise<ChatMessage[]> {
    return this.messages.filter((m) => m.orderId === orderId);
  }

  async sendMessage(dto: SendMessageDto): Promise<{ userMessage: ChatMessage; replyMessage?: ChatMessage }> {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now().toString().slice(-5)}`,
      orderId: dto.orderId,
      orderType: dto.orderType,
      senderRole: dto.senderRole,
      message: dto.message,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
      isRead: true,
    };

    this.messages.push(userMessage);

    // Auto-reply simulation from Driver if Customer is sending
    let replyMessage: ChatMessage | undefined;
    if (dto.senderRole === 'CUSTOMER') {
      let replyText = 'Siap kak, pesan diterima dan segera saya laksanakan!';
      const lower = dto.message.toLowerCase();
      if (lower.includes('sambal') || lower.includes('pedas')) {
        replyText = 'Baik kak, sambal sudah dipisah dengan aman.';
      } else if (lower.includes('pos') || lower.includes('satpam') || lower.includes('titip')) {
        replyText = 'Siap, nanti paketnya saya serahkan ke petugas pos satpam ya kak.';
      } else if (lower.includes('lokasi') || lower.includes('mana')) {
        replyText = 'Saya sedang dalam perjalanan menuju lokasi Anda, estimasi 5 menit sampai.';
      }

      replyMessage = {
        id: `msg-${(Date.now() + 100).toString().slice(-5)}`,
        orderId: dto.orderId,
        orderType: dto.orderType,
        senderRole: 'DRIVER',
        message: replyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
        isRead: true,
      };

      this.messages.push(replyMessage);
    }

    return { userMessage, replyMessage };
  }
}
