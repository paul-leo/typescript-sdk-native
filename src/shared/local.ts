import { JSONRPCMessage } from "../types.js";

/**
 * Local transport registry to store and retrieve transports by ID.
 * This allows client and server transports to find each other in the same process.
 */
export class LocalTransportRegistry {
  private static instance: LocalTransportRegistry;
  private transportMap = new Map<string, {
    onmessage?: (message: JSONRPCMessage) => void;
  }>();

  private constructor() {}

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): LocalTransportRegistry {
    if (!LocalTransportRegistry.instance) {
      LocalTransportRegistry.instance = new LocalTransportRegistry();
    }
    return LocalTransportRegistry.instance;
  }

  /**
   * Register a transport with the given ID
   */
  register(id: string, callbacks: { onmessage?: (message: JSONRPCMessage) => void }): void {
    this.transportMap.set(id, callbacks);
  }

  /**
   * Unregister a transport
   */
  unregister(id: string): void {
    this.transportMap.delete(id);
  }

  /**
   * Send a message to the transport with the given ID
   */
  send(targetId: string, message: JSONRPCMessage): void {
    const target = this.transportMap.get(targetId);
    if (!target) {
      throw new Error(`Transport with ID ${targetId} not found`);
    }
    
    // Use setTimeout to simulate async behavior and ensure this runs after the current call stack
    setTimeout(() => {
      target.onmessage?.(message);
    }, 0);
  }
} 