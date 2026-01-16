import { executeSequentialToolCall } from "./toolExecution";
import { createTool } from "@/tools/SimpleTool";
import { z } from "zod";

// Mock dependencies
jest.mock("@/plusUtils", () => ({
  checkIsPlusUser: jest.fn(),
}));

jest.mock("@/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock("@/tools/toolManager", () => ({
  ToolManager: {
    callTool: jest.fn(),
  },
}));

import { checkIsPlusUser } from "@/plusUtils";
import { ToolManager } from "@/tools/toolManager";

describe("toolExecution", () => {
  const mockCheckIsPlusUser = checkIsPlusUser as jest.MockedFunction<typeof checkIsPlusUser>;
  const mockCallTool = ToolManager.callTool as jest.MockedFunction<typeof ToolManager.callTool>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("executeSequentialToolCall", () => {
    it("should execute tools without isPlusOnly flag", async () => {
      const testTool = createTool({
        name: "testTool",
        description: "Test tool",
        schema: z.object({ input: z.string() }),
        handler: async ({ input }) => `Result: ${input}`,
      });

      mockCallTool.mockResolvedValueOnce("Tool executed successfully");

      const result = await executeSequentialToolCall(
        { name: "testTool", args: { input: "test" } },
        [testTool]
      );

      expect(result).toEqual({
        toolName: "testTool",
        result: "Tool executed successfully",
        success: true,
      });
      expect(mockCheckIsPlusUser).not.toHaveBeenCalled();
    });

    it("should allow plus-only tools for all users (bypass)", async () => {
      const plusTool = createTool({
        name: "plusTool",
        description: "Plus-only tool",
        schema: z.void(),
        handler: async () => "Plus tool executed",
        isPlusOnly: true,
      });

      // Even if checkIsPlusUser returns false (though we patched it to true, we removed the check logic entirely)
      // The tool execution logic should no longer call checkIsPlusUser or block execution
      mockCheckIsPlusUser.mockResolvedValueOnce(false);
      mockCallTool.mockResolvedValueOnce("Plus tool executed");

      const result = await executeSequentialToolCall({ name: "plusTool", args: {} }, [plusTool]);

      expect(result).toEqual({
        toolName: "plusTool",
        result: "Plus tool executed",
        success: true,
      });
      // Verification: mockCheckIsPlusUser should NOT be called because the check was removed
      expect(mockCheckIsPlusUser).not.toHaveBeenCalled();
      expect(mockCallTool).toHaveBeenCalled();
    });

    it("should handle tool not found", async () => {
      const result = await executeSequentialToolCall({ name: "unknownTool", args: {} }, []);

      expect(result).toEqual({
        toolName: "unknownTool",
        result:
          "Error: Tool 'unknownTool' not found. Available tools: . Make sure you have the tool enabled in the Agent settings.",
        success: false,
      });
    });

    it("should handle invalid tool call", async () => {
      const result = await executeSequentialToolCall(null as any, []);

      expect(result).toEqual({
        toolName: "unknown",
        result: "Error: Invalid tool call - missing tool name",
        success: false,
      });
    });
  });
});
