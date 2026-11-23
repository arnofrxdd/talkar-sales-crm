import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  companySlug?: string;
}

class EventService {
  private clients: SSEClient[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(id: string, res: Response, companySlug?: string) {
    this.clients.push({ id, res, companySlug });
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((client) => client.id !== id);
  }

  broadcast(eventType: string, data: any, targetCompanySlug?: string) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((client) => {
      if (
        !targetCompanySlug ||
        !client.companySlug ||
        client.companySlug === 'all' ||
        client.companySlug === targetCompanySlug
      ) {
        try {
          client.res.write(payload);
        } catch (err) {
          console.error(`Failed to push SSE to client ${client.id}:`, err);
        }
      }
    });
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        try {
          client.res.write(`: heartbeat\n\n`);
        } catch {
          // ignore dead connections; handled on req close
        }
      });
    }, 20000);
  }
}

export const eventService = new EventService();
