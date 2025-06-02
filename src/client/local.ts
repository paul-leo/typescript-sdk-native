import { LocalTransportRegistry } from "../shared/local.js";
import { Transport, TransportSendOptions } from "../shared/transport.js";
import { JSONRPCMessage } from "../types.js";
import { LocalServerTransport } from "../server/local.js";
import { generateUUID } from "../shared/utils.js";

/**
 * Client transport for local communication: this will connect to a server in the same process.
 * 
 * This transport can be used in Node.js, browser, and React Native environments.
 */
export class LocalClientTransport implements Transport {
  private _connected = false;
  private _registry = LocalTransportRegistry.getInstance();
  public readonly sessionId: string;
  private _serverTransport?: LocalServerTransport;
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  /**
   * Creates a new local client transport that will connect to the specified server transport.
   * @param serverTransport The server transport to connect to
   */
  constructor(serverTransport: LocalServerTransport) {
    this.sessionId = generateUUID();
    this._serverTransport = serverTransport;
    
    // Register this transport with the registry
    this._registry.register(this.sessionId, {
      onmessage: (message) => {
        this.onmessage?.(message);
      }
    });
  }

  /**
   * Start the transport and establish connection with the server.
   */
  async start(): Promise<void> {
    if (this._connected) {
      throw new Error(
        "LocalClientTransport already started! If using Client class, note that connect() calls start() automatically."
      );
    }
    
    if (!this._serverTransport) {
      throw new Error("No server transport provided");
    }
    
    // Tell the server about this client
    this._serverTransport._setClientId(this.sessionId);
    
    this._connected = true;
  }

  /**
   * Sends a message to the connected server.
   */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    if (!this._connected) {
      throw new Error("Not connected");
    }
    
    if (!this._serverTransport) {
      throw new Error("No server transport connected");
    }
    
    this._registry.send(this._serverTransport.sessionId, message);
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
} 