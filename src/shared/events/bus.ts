/**
 * Simple event bus for module-to-module communication
 * Supports typed events and async handlers
 */

type EventHandler<T = any> = (payload: T) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Register an event listener
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler as EventHandler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(handler as EventHandler);
        if (handlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event to all registered listeners
   * Executes handlers in parallel
   */
  async emit<T = any>(event: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.handlers.delete(event);
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size || 0;
  }
}

// Singleton instance
export const eventBus = new EventBus();
