import { Injectable, Logger } from '@nestjs/common';

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
  private readonly logger = new Logger(RealtimeGateway.name);

  authenticateSocket(client: any): { authenticated: boolean; user?: { id: string; role: string } } {
    const rawToken =
      client?.handshake?.auth?.token ||
      client?.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!rawToken) {
      return { authenticated: false };
    }

    try {
      const parts = rawToken.split('.');
      if (parts.length !== 3) {
        return { authenticated: false };
      }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        return { authenticated: false };
      }
      return {
        authenticated: true,
        user: { id: payload.sub, role: payload.role },
      };
    } catch {
      return { authenticated: false };
    }
  }

  handleConnection(client: any) {
    const auth = this.authenticateSocket(client);
    if (!auth.authenticated) {
      this.logger.warn('Unauthorized WebSocket connection attempt rejected');
      if (typeof client?.disconnect === 'function') {
        client.disconnect(true);
      }
      return { event: 'error', code: 'UNAUTHORIZED', message: 'Koneksi WebSocket ditolak: token tidak valid' };
    }

    if (client) {
      client.user = auth.user;
    }
    return { event: 'connected', user: auth.user, timestamp: new Date().toISOString() };
  }

  handleChatMessage(
    payload: { orderId: string; message: string; senderRole: string },
    client?: any
  ) {
    if (!payload?.orderId || !payload?.message?.trim()) {
      return { event: 'error', code: 'INVALID_PAYLOAD', message: 'Payload chat tidak lengkap' };
    }

    // Verify sender identity from authenticated socket if present
    if (client?.user) {
      if (client.user.role !== payload.senderRole && client.user.role !== 'ADMIN') {
        return { event: 'error', code: 'FORBIDDEN', message: 'Role pengirim tidak sesuai dengan kredensial aktif' };
      }
    }

    return {
      event: 'chat:message',
      payload: {
        ...payload,
        message: payload.message.trim(),
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
