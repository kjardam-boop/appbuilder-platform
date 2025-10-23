/**
 * Event Bus
 * Simple pub/sub event system for loosely coupled module communication
 */

type EventCallback = (data: any) => void;

class EventBus {
  private static events: Map<string, EventCallback[]> = new Map();

  static emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in callback for event "${event}":`, error);
        }
      });
    }
  }

  static on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  static off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  static once(event: string, callback: EventCallback) {
    const onceCallback: EventCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  static clear(event?: string) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export default EventBus;
