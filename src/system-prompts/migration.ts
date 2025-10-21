import { TFile, Vault } from "obsidian";
import {
  ensurePromptFrontmatter,
  getPromptFilePath,
  getSystemPromptsFolder,
  loadAllSystemPrompts,
  parseSystemPromptFile,
} from "@/system-prompts/systemPromptUtils";
import { UserSystemPrompt } from "@/system-prompts/type";
import { logError, logInfo, logWarn } from "@/logger";
import { getSettings, updateSetting } from "@/settings/model";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { ensureFolderExists } from "@/utils";

/**
 * Default name for migrated system prompt
 */
const MIGRATED_PROMPT_NAME = "Migrated Custom System Prompt";

/**
 * Generate a unique prompt name by appending a number suffix if the base name exists
 * @param baseName - The base name to start with
 * @param vault - The vault to check for existing files
 * @returns A unique prompt name that doesn't conflict with existing files
 */
function generateUniquePromptName(baseName: string, vault: Vault): string {
  let name = baseName;
  let counter = 1;

  // Keep incrementing until we find a name that doesn't exist
  while (vault.getAbstractFileByPath(getPromptFilePath(name))) {
    counter++;
    name = `${baseName} ${counter}`;
  }

  return name;
}

/**
 * Normalize line endings to LF for consistent comparison
 * Reason: File systems may convert CRLF to LF on write, causing false mismatches
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Verify that migrated content matches the original legacy prompt
 * This is the "write-then-verify" safety check
 * @param file - The file to verify
 * @param originalContent - The original content that should have been saved
 * @returns true if content matches, false otherwise
 */
async function verifyMigratedContent(file: TFile, originalContent: string): Promise<boolean> {
  try {
    const savedPrompt = await parseSystemPromptFile(file);
    // Normalize line endings and trim to handle CRLF/LF differences
    const savedNormalized = normalizeLineEndings(savedPrompt.content).trim();
    const originalNormalized = normalizeLineEndings(originalContent).trim();

    if (savedNormalized !== originalNormalized) {
      logWarn(
        `Migration verification failed: content mismatch. ` +
          `Expected ${originalNormalized.length} chars, got ${savedNormalized.length} chars`
      );
      return false;
    }

    return true;
  } catch (error) {
    logError("Migration verification failed: unable to read back file", error);
    return false;
  }
}

/**
 * Migrate the legacy userSystemPrompt from settings to a file
 * Automatically migrates and shows a notification modal to inform the user
 *
 * Safety guarantees:
 * 1. If target file exists, generates a unique name (never overwrites)
 * 2. After writing, reads back and verifies content matches
 * 3. Only clears userSystemPrompt AFTER verification passes
 * 4. If verification fails, userSystemPrompt is preserved
 */
export async function migrateSystemPromptsFromSettings(vault: Vault): Promise<void> {
  const settings = getSettings();
  const legacyPrompt = settings.userSystemPrompt;

  // Skip if empty or already migrated
  if (!legacyPrompt || legacyPrompt.trim().length === 0) {
    logInfo("No legacy userSystemPrompt to migrate");
    return;
  }

  try {
    logInfo("Migrating legacy userSystemPrompt from settings to file system");

    // Ensure the system prompts folder exists (creates nested folders recursively)
    const folder = getSystemPromptsFolder();
    await ensureFolderExists(folder);

    // Generate a unique name if default name already exists
    // Reason: Prevents data loss when file exists with different content
    const promptName = generateUniquePromptName(MIGRATED_PROMPT_NAME, vault);
    const filePath = getPromptFilePath(promptName);

    if (promptName !== MIGRATED_PROMPT_NAME) {
      logInfo(`Default name already exists, using unique name: "${promptName}"`);
    }

    const now = Date.now();
    const newPrompt: UserSystemPrompt = {
      title: promptName,
      content: legacyPrompt.trim(),
      createdMs: now,
      modifiedMs: now,
      lastUsedMs: 0,
    };

    // Step 1: Create the file
    await vault.create(filePath, legacyPrompt.trim());

    // Step 2: Add frontmatter
    const file = vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      logError("Migration failed: file not found after creation");
      return; // Preserve userSystemPrompt - don't clear it
    }

    await ensurePromptFrontmatter(file, newPrompt);

    // Step 3: Write-then-verify - read back and confirm content matches
    // Reason: Ensures data was actually persisted before clearing legacy field
    const verificationPassed = await verifyMigratedContent(file, legacyPrompt);

    if (!verificationPassed) {
      logError(
        "Migration verification failed: content mismatch. " +
          "Legacy userSystemPrompt preserved for safety. Please migrate manually."
      );
      // Do NOT clear userSystemPrompt - data may be lost
      return;
    }

    // Step 4: Verification passed - safe to clear legacy field
    logInfo(`Successfully migrated legacy userSystemPrompt to "${promptName}"`);
    updateSetting("userSystemPrompt", "");
    updateSetting("defaultSystemPromptTitle", promptName);

    // Reload all prompts to update cache
    await loadAllSystemPrompts();

    // Show notification modal to inform user
    new ConfirmModal(
      app,
      () => {},
      `We have upgraded your system prompt to the new file-based format. It is now stored as "${promptName}" in ${folder}.\n\nYou can now:\n• Edit your system prompt directly in the file\n• Create multiple system prompts\n• Manage prompts through the settings UI\n\nYour migrated prompt has been set as the default system prompt.`,
      "🚀 System Prompt Upgraded",
      "OK",
      ""
    ).open();
  } catch (error) {
    // On any error, preserve userSystemPrompt for safety
    logError("Failed to migrate legacy userSystemPrompt:", error);
  }
}
