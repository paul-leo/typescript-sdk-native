import { LocalTransportRegistry } from "../shared/local.js";
import { Transport, TransportSendOptions } from "../shared/transport.js";
import { JSONRPCMessage } from "../types.js";
import { AuthInfo } from "./auth/types.js";
import { generateUUID } from "../shared/utils.js";

/**
 * Server transport for local communication: this allows direct in-process communication
 * with a client using the LocalClientTransport.
 * 
 * This transport can be used in Node.js, browser, and React Native environments.
 */
export class LocalServerTransport implements Transport {
  private _connected = false;
  private _registry = LocalTransportRegistry.getInstance();
  public readonly sessionId: string;
  private _clientId?: string;
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: AuthInfo }) => void;

  /**
   * Creates a new local server transport.
   * @param id Optional custom ID for this transport. If not provided, a random UUID will be generated.
   */
  constructor(id?: string) {
    this.sessionId = id || generateUUID();
    
    // Register this transport with the registry
    this._registry.register(this.sessionId, {
      onmessage: (message) => {
        this.onmessage?.(message);
      }
    });
  }

  /**
   * Start the transport. For local transport, this just marks it as connected.
   */
  async start(): Promise<void> {
    if (this._connected) {
      throw new Error(
        "LocalServerTransport already started! If using Server class, note that connect() calls start() automatically."
      );
    }
    
    this._connected = true;
  }

  /**
   * Sends a message to the connected client.
   */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    if (!this._connected) {
      throw new Error("Not connected");
    }
    
    if (!this._clientId) {
      throw new Error("No client connected");
    }
    
    this._registry.send(this._clientId, message);
  }

  /**
   * Close the transport.
   */
  async close(): Promise<void> {
    if (this._connected) {
      this._registry.unregister(this.sessionId);
      this._connected = false;
      this.onclose?.();
    }
  }

  /**
   * Set the connected client ID.
   * This is called by the LocalClientTransport during connection.
   * @internal
   */
  _setClientId(clientId: string): void {
    this._clientId = clientId;
  }
} 