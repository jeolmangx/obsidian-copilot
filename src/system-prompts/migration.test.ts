import { migrateSystemPromptsFromSettings } from "@/system-prompts/migration";
import { TFile, Vault } from "obsidian";
import * as settingsModel from "@/settings/model";
import * as systemPromptUtils from "@/system-prompts/systemPromptUtils";
import * as logger from "@/logger";
import * as utils from "@/utils";

// Mock Obsidian
jest.mock("obsidian", () => ({
  TFile: jest.fn(),
  Vault: jest.fn(),
  normalizePath: jest.fn((path: string) => path),
}));

// Mock settings
jest.mock("@/settings/model", () => ({
  getSettings: jest.fn(),
  updateSetting: jest.fn(),
}));

// Mock logger
jest.mock("@/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock system prompt utils
jest.mock("@/system-prompts/systemPromptUtils", () => ({
  getSystemPromptsFolder: jest.fn(() => "SystemPrompts"),
  getPromptFilePath: jest.fn((title: string) => `SystemPrompts/${title}.md`),
  ensurePromptFrontmatter: jest.fn(),
  loadAllSystemPrompts: jest.fn(),
  parseSystemPromptFile: jest.fn(),
}));

// Mock utils
jest.mock("@/utils", () => ({
  ensureFolderExists: jest.fn(),
}));

// Mock ConfirmModal
jest.mock("@/components/modals/ConfirmModal", () => ({
  ConfirmModal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
  })),
}));

describe("migrateSystemPromptsFromSettings", () => {
  let mockVault: Vault;
  let originalApp: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the utils mock
    (utils.ensureFolderExists as jest.Mock).mockReset();
    (utils.ensureFolderExists as jest.Mock).mockResolvedValue(undefined);

    // Default: parseSystemPromptFile returns content that matches the input
    // This simulates successful write-then-verify
    (systemPromptUtils.parseSystemPromptFile as jest.Mock).mockImplementation(async () => ({
      title: "Migrated Custom System Prompt",
      content: "This is a legacy system prompt.",
      createdMs: Date.now(),
      modifiedMs: Date.now(),
      lastUsedMs: 0,
    }));

    // Create mock vault
    mockVault = {
      getAbstractFileByPath: jest.fn(),
      createFolder: jest.fn(),
      create: jest.fn(),
    } as unknown as Vault;

    // Mock global app
    originalApp = global.app;
    global.app = {
      vault: mockVault,
    } as any;
  });

  afterEach(() => {
    global.app = originalApp;
  });

  it("skips migration when userSystemPrompt is empty", async () => {
    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: "",
    });

    await migrateSystemPromptsFromSettings(mockVault);

    expect(logger.logInfo).toHaveBeenCalledWith("No legacy userSystemPrompt to migrate");
    expect(mockVault.create).not.toHaveBeenCalled();
  });

  it("skips migration when userSystemPrompt is whitespace only", async () => {
    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: "   ",
    });

    await migrateSystemPromptsFromSettings(mockVault);

    expect(logger.logInfo).toHaveBeenCalledWith("No legacy userSystemPrompt to migrate");
    expect(mockVault.create).not.toHaveBeenCalled();
  });

  it("creates system prompts folder if it does not exist", async () => {
    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: "This is a legacy system prompt.",
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist
      .mockReturnValueOnce({
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile); // File created

    await migrateSystemPromptsFromSettings(mockVault);

    expect(utils.ensureFolderExists).toHaveBeenCalledWith("SystemPrompts");
  });

  it("does not create folder if it already exists", async () => {
    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: "This is a legacy system prompt.",
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist
      .mockReturnValueOnce({
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile); // File created

    await migrateSystemPromptsFromSettings(mockVault);

    // ensureFolderExists is always called, but it handles existing folders gracefully
    expect(utils.ensureFolderExists).toHaveBeenCalledWith("SystemPrompts");
  });

  it("migrates legacy prompt to file with correct content", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist
      .mockReturnValueOnce({
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile); // File created

    await migrateSystemPromptsFromSettings(mockVault);

    expect(mockVault.create).toHaveBeenCalledWith(
      "SystemPrompts/Migrated Custom System Prompt.md",
      legacyPrompt
    );
  });

  it("trims whitespace from legacy prompt content", async () => {
    const legacyPrompt = "  This is a legacy system prompt.  \n\n";
    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(mockVault.create).toHaveBeenCalledWith(
      "SystemPrompts/Migrated Custom System Prompt.md",
      "This is a legacy system prompt."
    );
  });

  it("adds frontmatter to migrated file", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const mockFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist check
      .mockReturnValueOnce(mockFile); // File retrieved after creation

    Object.setPrototypeOf(mockFile, TFile.prototype);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(systemPromptUtils.ensurePromptFrontmatter).toHaveBeenCalledWith(
      mockFile,
      expect.objectContaining({
        title: "Migrated Custom System Prompt",
        content: legacyPrompt,
      })
    );
  });

  it("clears legacy userSystemPrompt from settings after migration", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const mockFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist check
      .mockReturnValueOnce(mockFile); // File retrieved after creation

    Object.setPrototypeOf(mockFile, TFile.prototype);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(settingsModel.updateSetting).toHaveBeenCalledWith("userSystemPrompt", "");
  });

  it("sets migrated prompt as default", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const mockFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist check
      .mockReturnValueOnce(mockFile); // File retrieved after creation

    Object.setPrototypeOf(mockFile, TFile.prototype);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(settingsModel.updateSetting).toHaveBeenCalledWith(
      "defaultSystemPromptTitle",
      "Migrated Custom System Prompt"
    );
  });

  it("reloads all prompts after migration", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const mockFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist check
      .mockReturnValueOnce(mockFile); // File retrieved after creation

    Object.setPrototypeOf(mockFile, TFile.prototype);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(systemPromptUtils.loadAllSystemPrompts).toHaveBeenCalled();
  });

  it("generates unique name when default file already exists", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const existingFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;
    const newFile = {
      path: "SystemPrompts/Migrated Custom System Prompt 2.md",
    } as TFile;

    Object.setPrototypeOf(newFile, TFile.prototype);

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });

    // First call: check default name - exists
    // Second call: check "...Prompt 2" - doesn't exist
    // Third call: get file after creation
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(existingFile) // Default name exists
      .mockReturnValueOnce(null) // "...Prompt 2" doesn't exist
      .mockReturnValueOnce(newFile); // File created

    await migrateSystemPromptsFromSettings(mockVault);

    // Should create file with unique name
    expect(mockVault.create).toHaveBeenCalledWith(
      "SystemPrompts/Migrated Custom System Prompt 2.md",
      legacyPrompt
    );
    expect(logger.logInfo).toHaveBeenCalledWith(
      'Default name already exists, using unique name: "Migrated Custom System Prompt 2"'
    );
    expect(settingsModel.updateSetting).toHaveBeenCalledWith(
      "defaultSystemPromptTitle",
      "Migrated Custom System Prompt 2"
    );
  });

  it("generates incrementing unique names when multiple files exist", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const newFile = {
      path: "SystemPrompts/Migrated Custom System Prompt 3.md",
    } as TFile;

    Object.setPrototypeOf(newFile, TFile.prototype);

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });

    // Simulate: default, "2", and "3" checks, then file creation
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce({ path: "exists" }) // Default exists
      .mockReturnValueOnce({ path: "exists" }) // "...Prompt 2" exists
      .mockReturnValueOnce(null) // "...Prompt 3" doesn't exist
      .mockReturnValueOnce(newFile); // File created

    await migrateSystemPromptsFromSettings(mockVault);

    expect(mockVault.create).toHaveBeenCalledWith(
      "SystemPrompts/Migrated Custom System Prompt 3.md",
      legacyPrompt
    );
  });

  it("logs success message after migration", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const mockFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist check
      .mockReturnValueOnce(mockFile); // File retrieved after creation

    Object.setPrototypeOf(mockFile, TFile.prototype);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(logger.logInfo).toHaveBeenCalledWith(
      'Successfully migrated legacy userSystemPrompt to "Migrated Custom System Prompt"'
    );
  });

  it("handles errors gracefully", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const error = new Error("Vault error");

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
    (utils.ensureFolderExists as jest.Mock).mockRejectedValue(error);

    await migrateSystemPromptsFromSettings(mockVault);

    expect(logger.logError).toHaveBeenCalledWith(
      "Failed to migrate legacy userSystemPrompt:",
      error
    );
  });

  it("does not throw error on migration failure", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const error = new Error("Vault error");

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
    (utils.ensureFolderExists as jest.Mock).mockRejectedValue(error);

    await expect(migrateSystemPromptsFromSettings(mockVault)).resolves.not.toThrow();
  });

  it("sets correct timestamps for migrated prompt", async () => {
    const legacyPrompt = "This is a legacy system prompt.";
    const mockFile = {
      path: "SystemPrompts/Migrated Custom System Prompt.md",
    } as TFile;

    (settingsModel.getSettings as jest.Mock).mockReturnValue({
      userSystemPrompt: legacyPrompt,
    });
    (mockVault.getAbstractFileByPath as jest.Mock)
      .mockReturnValueOnce(null) // File does not exist check
      .mockReturnValueOnce(mockFile); // File retrieved after creation

    Object.setPrototypeOf(mockFile, TFile.prototype);

    const beforeTime = Date.now();
    await migrateSystemPromptsFromSettings(mockVault);
    const afterTime = Date.now();

    expect(systemPromptUtils.ensurePromptFrontmatter).toHaveBeenCalledWith(
      mockFile,
      expect.objectContaining({
        title: "Migrated Custom System Prompt",
        content: legacyPrompt,
        lastUsedMs: 0,
      })
    );

    const callArgs = (systemPromptUtils.ensurePromptFrontmatter as jest.Mock).mock.calls[0][1];
    expect(callArgs.createdMs).toBeGreaterThanOrEqual(beforeTime);
    expect(callArgs.createdMs).toBeLessThanOrEqual(afterTime);
    expect(callArgs.modifiedMs).toBeGreaterThanOrEqual(beforeTime);
    expect(callArgs.modifiedMs).toBeLessThanOrEqual(afterTime);
  });

  // Write-then-verify tests
  describe("write-then-verify safety", () => {
    it("preserves userSystemPrompt when verification fails due to content mismatch", async () => {
      const legacyPrompt = "This is a legacy system prompt.";
      const mockFile = {
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile;

      Object.setPrototypeOf(mockFile, TFile.prototype);

      (settingsModel.getSettings as jest.Mock).mockReturnValue({
        userSystemPrompt: legacyPrompt,
      });
      (mockVault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(null) // File does not exist check
        .mockReturnValueOnce(mockFile); // File retrieved after creation

      // Simulate content mismatch - file content differs from original
      (systemPromptUtils.parseSystemPromptFile as jest.Mock).mockResolvedValueOnce({
        title: "Migrated Custom System Prompt",
        content: "Different content that does not match!",
        createdMs: Date.now(),
        modifiedMs: Date.now(),
        lastUsedMs: 0,
      });

      await migrateSystemPromptsFromSettings(mockVault);

      // Should NOT clear userSystemPrompt when verification fails
      expect(settingsModel.updateSetting).not.toHaveBeenCalledWith("userSystemPrompt", "");
      expect(logger.logError).toHaveBeenCalledWith(
        expect.stringContaining("Migration verification failed: content mismatch")
      );
    });

    it("preserves userSystemPrompt when file not found after creation", async () => {
      const legacyPrompt = "This is a legacy system prompt.";

      (settingsModel.getSettings as jest.Mock).mockReturnValue({
        userSystemPrompt: legacyPrompt,
      });
      (mockVault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(null) // File does not exist check
        .mockReturnValueOnce(null); // File NOT found after creation (unexpected)

      await migrateSystemPromptsFromSettings(mockVault);

      // Should NOT clear userSystemPrompt when file not found
      expect(settingsModel.updateSetting).not.toHaveBeenCalledWith("userSystemPrompt", "");
      expect(logger.logError).toHaveBeenCalledWith(
        "Migration failed: file not found after creation"
      );
    });

    it("preserves userSystemPrompt when parseSystemPromptFile throws", async () => {
      const legacyPrompt = "This is a legacy system prompt.";
      const mockFile = {
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile;

      Object.setPrototypeOf(mockFile, TFile.prototype);

      (settingsModel.getSettings as jest.Mock).mockReturnValue({
        userSystemPrompt: legacyPrompt,
      });
      (mockVault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(null) // File does not exist check
        .mockReturnValueOnce(mockFile); // File retrieved after creation

      // Simulate parseSystemPromptFile throwing an error
      (systemPromptUtils.parseSystemPromptFile as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to read file")
      );

      await migrateSystemPromptsFromSettings(mockVault);

      // Should NOT clear userSystemPrompt when verification throws
      expect(settingsModel.updateSetting).not.toHaveBeenCalledWith("userSystemPrompt", "");
      expect(logger.logError).toHaveBeenCalledWith(
        "Migration verification failed: unable to read back file",
        expect.any(Error)
      );
    });

    it("clears userSystemPrompt only after successful verification", async () => {
      const legacyPrompt = "This is a legacy system prompt.";
      const mockFile = {
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile;

      Object.setPrototypeOf(mockFile, TFile.prototype);

      (settingsModel.getSettings as jest.Mock).mockReturnValue({
        userSystemPrompt: legacyPrompt,
      });
      (mockVault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(null) // File does not exist check
        .mockReturnValueOnce(mockFile); // File retrieved after creation

      // Simulate successful verification - content matches
      (systemPromptUtils.parseSystemPromptFile as jest.Mock).mockResolvedValueOnce({
        title: "Migrated Custom System Prompt",
        content: legacyPrompt, // Exact match
        createdMs: Date.now(),
        modifiedMs: Date.now(),
        lastUsedMs: 0,
      });

      await migrateSystemPromptsFromSettings(mockVault);

      // Should clear userSystemPrompt after successful verification
      expect(settingsModel.updateSetting).toHaveBeenCalledWith("userSystemPrompt", "");
      expect(settingsModel.updateSetting).toHaveBeenCalledWith(
        "defaultSystemPromptTitle",
        "Migrated Custom System Prompt"
      );
    });

    it("handles whitespace differences in verification", async () => {
      const legacyPrompt = "  This is a legacy system prompt.  \n\n";
      const mockFile = {
        path: "SystemPrompts/Migrated Custom System Prompt.md",
      } as TFile;

      Object.setPrototypeOf(mockFile, TFile.prototype);

      (settingsModel.getSettings as jest.Mock).mockReturnValue({
        userSystemPrompt: legacyPrompt,
      });
      (mockVault.getAbstractFileByPath as jest.Mock)
        .mockReturnValueOnce(null) // File does not exist check
        .mockReturnValueOnce(mockFile); // File retrieved after creation

      // Content matches after trim
      (systemPromptUtils.parseSystemPromptFile as jest.Mock).mockResolvedValueOnce({
        title: "Migrated Custom System Prompt",
        content: "This is a legacy system prompt.", // Trimmed version
        createdMs: Date.now(),
        modifiedMs: Date.now(),
        lastUsedMs: 0,
      });

      await migrateSystemPromptsFromSettings(mockVault);

      // Should succeed - whitespace differences are acceptable
      expect(settingsModel.updateSetting).toHaveBeenCalledWith("userSystemPrompt", "");
    });
  });
});
