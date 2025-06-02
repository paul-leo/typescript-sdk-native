import { Client } from "./client/index.js";
import { LocalClientTransport } from "./client/local.js";
import { McpServer } from "./server/mcp.js";
import { LocalServerTransport } from "./server/local.js";
import { 
  CallToolRequest, 
  CallToolResultSchema, 
  NotificationSchema 
} from "./types.js";
import { z } from "zod";

describe("Local Transport", () => {
  let server: McpServer;
  let serverTransport: LocalServerTransport;
  let clientTransport: LocalClientTransport;
  let client: Client;

  beforeEach(async () => {
    // Create server and transport
    server = new McpServer({
      name: "test-server",
      version: "1.0.0"
    });
    serverTransport = new LocalServerTransport();
    
    // Create client and transport
    clientTransport = new LocalClientTransport(serverTransport);
    client = new Client({
      name: "test-client",
      version: "1.0.0"
    });
    
    // Register a simple test tool
    server.tool(
      "echo",
      "A simple echo tool that returns the input message",
      {
        message: z.string().describe("The message to echo back")
      },
      async ({ message }) => ({
        content: [{ type: "text", text: message }]
      })
    );
    
    // Connect server and client
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await clientTransport.close();
    await serverTransport.close();
  });

  test("Client can call a tool on the server", async () => {
    // Create a tool call request
    const request: CallToolRequest = {
      method: "tools/call",
      params: {
        name: "echo",
        arguments: {
          message: "Hello, world!"
        }
      }
    };
    
    // Call the tool and get the result
    const result = await client.request(request, CallToolResultSchema);
    
    // Check the result
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("Hello, world!");
  });

  test("Server can send notifications to client", async () => {
    // Create a custom notification schema
    const TestNotificationSchema = NotificationSchema.extend({
      method: z.literal("test/notification"),
      params: z.object({
        message: z.string()
      })
    });
    
    // Set up a notification handler
    const notificationPromise = new Promise<string>((resolve) => {
      client.setNotificationHandler(TestNotificationSchema, (notification) => {
        resolve(notification.params.message);
      });
    });
    
    // Server sends a notification
    await serverTransport.send({
      jsonrpc: "2.0",
      method: "test/notification",
      params: {
        message: "Test notification"
      }
    });
    
    // Wait for the notification and check the result
    const message = await notificationPromise;
    expect(message).toBe("Test notification");
  });

  test("Transport closes properly", async () => {
    // Set up close handlers
    const serverClosePromise = new Promise<void>((resolve) => {
      serverTransport.onclose = resolve;
    });
    
    const clientClosePromise = new Promise<void>((resolve) => {
      clientTransport.onclose = resolve;
    });
    
    // Close the transports
    await clientTransport.close();
    await serverTransport.close();
    
    // Wait for the close events
    await Promise.all([serverClosePromise, clientClosePromise]);
  });

  test("Multiple concurrent requests work correctly", async () => {
    // Create 5 concurrent requests
    const requests = Array.from({ length: 5 }, (_, i) => {
      const request: CallToolRequest = {
        method: "tools/call",
        params: {
          name: "echo",
          arguments: {
            message: `Message ${i + 1}`
          }
        }
      };
      
      return client.request(request, CallToolResultSchema);
    });
    
    // Wait for all requests to complete
    const results = await Promise.all(requests);
    
    // Check the results
    results.forEach((result, i) => {
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe(`Message ${i + 1}`);
    });
  });
}); 