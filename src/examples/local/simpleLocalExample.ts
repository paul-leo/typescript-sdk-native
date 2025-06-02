import { Client } from "../../client/index.js";
import { LocalClientTransport } from "../../client/local.js";
import { McpServer } from "../../server/mcp.js";
import { LocalServerTransport } from "../../server/local.js";
import { 
  CallToolRequest, 
  CallToolResultSchema, 
  ListToolsRequest,
  ListToolsResultSchema,
  LoggingMessageNotificationSchema
} from "../../types.js";
import { z } from "zod";

// 定义一个类型，仅包含我们需要访问的属性
interface ToolResult {
  content: Array<{
    type: string;
    text?: string;
  }>;
}

/**
 * Simple example demonstrating local transport between client and server
 * in the same process.
 * 
 * This example:
 * 1. Creates an MCP server with tools
 * 2. Creates a client that connects to the server
 * 3. Demonstrates tool calls and notifications
 * 
 * This pattern works in Node.js, browsers, and React Native.
 */
async function main() {
  console.log("MCP Local Transport Example");
  console.log("===========================");

  // Step 1: Create and set up the server
  console.log("\n[Step 1] Creating and setting up the server...");
  const server = new McpServer({
    name: "local-example-server",
    version: "1.0.0"
  }, { capabilities: { logging: {} } });

  // Add a simple calculator tool
  server.tool(
    "calculate",
    "Simple calculator with basic operations",
    {
      operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("The operation to perform"),
      a: z.number().describe("First operand"),
      b: z.number().describe("Second operand")
    },
    async ({ operation, a, b }, { sendNotification }) => {
      // Send a notification that we're processing
      await sendNotification({
        method: "notifications/message",
        params: {
          level: "info",
          data: `Performing calculation: ${a} ${operation} ${b}`
        }
      });

      // Calculate the result
      let result: number;
      switch (operation) {
        case "add": result = a + b; break;
        case "subtract": result = a - b; break;
        case "multiply": result = a * b; break;
        case "divide": 
          if (b === 0) {
            throw new Error("Division by zero");
          }
          result = a / b; 
          break;
      }

      // Return the result
      return {
        content: [
          {
            type: "text",
            text: `Result: ${result}`
          }
        ]
      };
    }
  );

  // Create server transport
  const serverTransport = new LocalServerTransport();
  
  // Step 2: Create and connect the client
  console.log("\n[Step 2] Creating and connecting the client...");
  const clientTransport = new LocalClientTransport(serverTransport);
  const client = new Client({
    name: "local-example-client",
    version: "1.0.0"
  });

  // Set up notification handler
  client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    console.log(`📢 Notification: ${notification.params.level} - ${notification.params.data}`);
  });

  // Connect both server and client
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  console.log("Server and client connected successfully");

  // Step 3: List available tools (using raw request)
  console.log("\n[Step 3] Listing available tools using raw request...");
  const toolsRequest: ListToolsRequest = {
    method: "tools/list",
    params: {}
  };

  const toolsResult = await client.request(toolsRequest, ListToolsResultSchema);
  console.log(`Found ${toolsResult.tools.length} tools:`);
  toolsResult.tools.forEach(tool => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });

  // Step 3.1: List available tools using client.listTools
  console.log("\n[Step 3.1] Listing available tools using client.listTools...");
  const toolsResponse = await client.listTools();
  console.log(`Found ${toolsResponse.tools.length} tools:`);
  toolsResponse.tools.forEach(tool => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });

  // Step 4: Call the calculator tool (using raw request)
  console.log("\n[Step 4] Calling the calculator tool using raw request...");
  const calculations = [
    { operation: "add", a: 5, b: 3 },
    { operation: "subtract", a: 10, b: 4 },
    { operation: "multiply", a: 6, b: 7 },
    { operation: "divide", a: 20, b: 5 }
  ];

  for (const calc of calculations) {
    const request: CallToolRequest = {
      method: "tools/call",
      params: {
        name: "calculate",
        arguments: calc
      }
    };

    console.log(`Calculating: ${calc.a} ${calc.operation} ${calc.b}`);
    const result = await client.request(request, CallToolResultSchema);
    console.log(`✅ ${result.content[0].text}`);
  }

  // Step 4.1: Call the calculator tool using client.callTool
  console.log("\n[Step 4.1] Calling the calculator tool using client.callTool...");
  
  for (const calc of calculations) {
    console.log(`Calculating: ${calc.a} ${calc.operation} ${calc.b}`);
    const result = await client.callTool({
      name: "calculate",
      arguments: calc
    });
    // 使用具体类型断言来访问 content 属性
    const toolResult = result as ToolResult;
    console.log(`✅ ${toolResult.content[0].text}`);
  }

  // Step 5: Try an error case
  console.log("\n[Step 5] Testing error handling with division by zero...");
  try {
    const errorRequest: CallToolRequest = {
      method: "tools/call",
      params: {
        name: "calculate",
        arguments: {
          operation: "divide",
          a: 10,
          b: 0
        }
      }
    };

    await client.request(errorRequest, CallToolResultSchema);
  } catch (error) {
    console.log(`❌ Error caught: ${error}`);
  }

  // Step 5.1: Try an error case using client.callTool
  console.log("\n[Step 5.1] Testing error handling with client.callTool...");
  try {
    await client.callTool({
      name: "calculate",
      arguments: {
        operation: "divide",
        a: 10,
        b: 0
      }
    });
  } catch (error) {
    console.log(`❌ Error caught: ${error}`);
  }

  // Step 6: Clean up
  console.log("\n[Step 6] Closing connections...");
  await clientTransport.close();
  await serverTransport.close();
  console.log("Connections closed");
}

// Run the example
main().catch(error => {
  console.error("Error in example:", error);
}); 