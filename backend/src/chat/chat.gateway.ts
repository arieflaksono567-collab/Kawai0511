import { Injectable } from '@nestjs/common';

/**
 * WebSocket Gateway Protocol Representation
 * Blueprint Section 10:
 * Events:
 * - location:update
 * - order:status
 * - order:new
 * - chat:message
 * - notification:push
 * Heartbeat: ping / pong
 */
@Injectable()
export class RealtimeGateway {
  handleConnection(client: any) {
    return { event: 'connected', timestamp: new Date().toISOString() };
  }

  handleChatMessage(payload: { orderId: string; message: string; senderRole: string }) {
    return {
      event: 'chat:message',
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
      },
    };
  }

  handleOrderStatus(orderId: string, status: string) {
    return {
      event: 'order:status',
      payload: { orderId, status, timestamp: new Date().toISOString() },
    };
  }

  handlePing() {
    return { event: 'pong', timestamp: Date.now() };
  }
}
