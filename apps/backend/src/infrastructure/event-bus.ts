import type { DomainEvent } from '@flow-app/domain';
import { logger } from './logger.js';

type EventHandler = (event: DomainEvent) => Promise<void>;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  publish(event: DomainEvent): void {
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      void handler(event).catch((err) =>
        logger.error({ err, eventType: event.eventType, aggregateId: event.aggregateId }, 'EventHandler failed'),
      );
    }
  }
}

export const eventBus = new EventBus();
