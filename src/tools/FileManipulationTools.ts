/**
 * File manipulation tools for rename, move, and delete operations
 * These tools allow the LLM to perform file system operations on vault files and folders
 */

import { z } from "zod";
import { createTool, SimpleTool } from "./SimpleTool";
import { TFile, TFolder, Notice } from "obsidian";
import { logError, logInfo } from "@/logger";

// ============================================================================
// RENAME FILE TOOL
// ============================================================================

const renameFileSchema = z.object({
  currentPath: z
    .string()
    .min(1)
    .describe("Current vault-relative path to the file (e.g., 'folder/note.md')"),
  newName: z
    .string()
    .min(1)
    .describe("New filename including extension (e.g., 'new-name.md'). Do not include path."),
});

export const renameFileTool: SimpleTool<
  typeof renameFileSchema,
  { success: boolean; message: string; newPath?: string }
> = createTool({
  name: "renameFile",
  description: "Rename a file in the vault. Only changes the filename, not its location.",
  schema: renameFileSchema,
  handler: async ({ currentPath, newName }) => {
    try {
      const file = app.vault.getAbstractFileByPath(currentPath);

      if (!file) {
        return {
          success: false,
          message: `File not found: ${currentPath}`,
        };
      }

      if (!(file instanceof TFile)) {
        return {
          success: false,
          message: `Path is not a file: ${currentPath}. Use renameFolderTool for folders.`,
        };
      }

      // Build new path: same directory + new name
      const directory = file.parent?.path || "";
      const newPath = directory ? `${directory}/${newName}` : newName;

      // Check if target already exists
      const existingFile = app.vault.getAbstractFileByPath(newPath);
      if (existingFile) {
        return {
          success: false,
          message: `A file already exists at: ${newPath}`,
        };
      }

      await app.fileManager.renameFile(file, newPath);

      logInfo(`[renameFileTool] Renamed ${currentPath} to ${newPath}`);
      new Notice(`Renamed: ${file.basename} → ${newName}`);

      return {
        success: true,
        message: `Successfully renamed file to: ${newPath}`,
        newPath,
      };
    } catch (error) {
      logError("[renameFileTool] Error:", error);
      return {
        success: false,
        message: `Failed to rename file: ${error.message}`,
      };
    }
  },
});

// ============================================================================
// MOVE FILE TOOL
// ============================================================================

const moveFileSchema = z.object({
  currentPath: z
    .string()
    .min(1)
    .describe("Current vault-relative path to the file (e.g., 'folder/note.md')"),
  destinationFolder: z
    .string()
    .describe("Destination folder path (e.g., 'Archive/2024'). Use empty string for vault root."),
});

export const moveFileTool: SimpleTool<
  typeof moveFileSchema,
  { success: boolean; message: string; newPath?: string }
> = createTool({
  name: "moveFile",
  description: "Move a file to a different folder in the vault.",
  schema: moveFileSchema,
  handler: async ({ currentPath, destinationFolder }) => {
    try {
      const file = app.vault.getAbstractFileByPath(currentPath);

      if (!file) {
        return {
          success: false,
          message: `File not found: ${currentPath}`,
        };
      }

      if (!(file instanceof TFile)) {
        return {
          success: false,
          message: `Path is not a file: ${currentPath}. Use moveFolderTool for folders.`,
        };
      }

      // Validate destination folder exists (unless it's root)
      if (destinationFolder && destinationFolder !== "") {
        const destFolder = app.vault.getAbstractFileByPath(destinationFolder);
        if (!destFolder) {
          return {
            success: false,
            message: `Destination folder not found: ${destinationFolder}. Create the folder first.`,
          };
        }
        if (!(destFolder instanceof TFolder)) {
          return {
            success: false,
            message: `Destination is not a folder: ${destinationFolder}`,
          };
        }
      }

      // Build new path
      const newPath = destinationFolder ? `${destinationFolder}/${file.name}` : file.name;

      // Check if target already exists
      const existingFile = app.vault.getAbstractFileByPath(newPath);
      if (existingFile) {
        return {
          success: false,
          message: `A file already exists at: ${newPath}`,
        };
      }

      await app.fileManager.renameFile(file, newPath);

      logInfo(`[moveFileTool] Moved ${currentPath} to ${newPath}`);
      new Notice(`Moved: ${file.name} → ${destinationFolder || "root"}`);

      return {
        success: true,
        message: `Successfully moved file to: ${newPath}`,
        newPath,
      };
    } catch (error) {
      logError("[moveFileTool] Error:", error);
      return {
        success: false,
        message: `Failed to move file: ${error.message}`,
      };
    }
  },
});

// ============================================================================
// DELETE FILE TOOL
// ============================================================================

const deleteFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe("Vault-relative path to the file to delete (e.g., 'folder/note.md')"),
  useSystemTrash: z
    .boolean()
    .optional()
    .describe(
      "If true, move to system trash (recoverable). If false, delete permanently. Default: true"
    ),
});

export const deleteFileTool: SimpleTool<
  typeof deleteFileSchema,
  { success: boolean; message: string }
> = createTool({
  name: "deleteFile",
  description: "Delete a file from the vault. By default, moves to system trash for recovery.",
  schema: deleteFileSchema,
  handler: async ({ path, useSystemTrash = true }) => {
    try {
      const file = app.vault.getAbstractFileByPath(path);

      if (!file) {
        return {
          success: false,
          message: `File not found: ${path}`,
        };
      }

      if (!(file instanceof TFile)) {
        return {
          success: false,
          message: `Path is not a file: ${path}. Use deleteFolderTool for folders.`,
        };
      }

      const fileName = file.name;

      if (useSystemTrash) {
        await app.vault.trash(file, true);
        logInfo(`[deleteFileTool] Trashed ${path}`);
        new Notice(`Moved to trash: ${fileName}`);
      } else {
        await app.vault.delete(file);
        logInfo(`[deleteFileTool] Permanently deleted ${path}`);
        new Notice(`Permanently deleted: ${fileName}`);
      }

      return {
        success: true,
        message: useSystemTrash
          ? `Successfully moved to trash: ${path}`
          : `Successfully deleted permanently: ${path}`,
      };
    } catch (error) {
      logError("[deleteFileTool] Error:", error);
      return {
        success: false,
        message: `Failed to delete file: ${error.message}`,
      };
    }
  },
});

// ============================================================================
// RENAME FOLDER TOOL
// ============================================================================

const renameFolderSchema = z.object({
  currentPath: z
    .string()
    .min(1)
    .describe("Current vault-relative path to the folder (e.g., 'Projects/OldName')"),
  newName: z.string().min(1).describe("New folder name (e.g., 'NewName'). Do not include path."),
});

export const renameFolderTool: SimpleTool<
  typeof renameFolderSchema,
  { success: boolean; message: string; newPath?: string }
> = createTool({
  name: "renameFolder",
  description: "Rename a folder in the vault. Only changes the folder name, not its location.",
  schema: renameFolderSchema,
  handler: async ({ currentPath, newName }) => {
    try {
      const folder = app.vault.getAbstractFileByPath(currentPath);

      if (!folder) {
        return {
          success: false,
          message: `Folder not found: ${currentPath}`,
        };
      }

      if (!(folder instanceof TFolder)) {
        return {
          success: false,
          message: `Path is not a folder: ${currentPath}. Use renameFileTool for files.`,
        };
      }

      // Build new path: parent directory + new name
      const parentPath = folder.parent?.path || "";
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      // Check if target already exists
      const existingFolder = app.vault.getAbstractFileByPath(newPath);
      if (existingFolder) {
        return {
          success: false,
          message: `A folder already exists at: ${newPath}`,
        };
      }

      await app.fileManager.renameFile(folder, newPath);

      logInfo(`[renameFolderTool] Renamed ${currentPath} to ${newPath}`);
      new Notice(`Renamed folder: ${folder.name} → ${newName}`);

      return {
        success: true,
        message: `Successfully renamed folder to: ${newPath}`,
        newPath,
      };
    } catch (error) {
      logError("[renameFolderTool] Error:", error);
      return {
        success: false,
        message: `Failed to rename folder: ${error.message}`,
      };
    }
  },
});

// ============================================================================
// MOVE FOLDER TOOL
// ============================================================================

const moveFolderSchema = z.object({
  currentPath: z
    .string()
    .min(1)
    .describe("Current vault-relative path to the folder (e.g., 'Projects/MyProject')"),
  destinationFolder: z
    .string()
    .describe("Destination parent folder path (e.g., 'Archive'). Use empty string for vault root."),
});

export const moveFolderTool: SimpleTool<
  typeof moveFolderSchema,
  { success: boolean; message: string; newPath?: string }
> = createTool({
  name: "moveFolder",
  description: "Move a folder to a different location in the vault.",
  schema: moveFolderSchema,
  handler: async ({ currentPath, destinationFolder }) => {
    try {
      const folder = app.vault.getAbstractFileByPath(currentPath);

      if (!folder) {
        return {
          success: false,
          message: `Folder not found: ${currentPath}`,
        };
      }

      if (!(folder instanceof TFolder)) {
        return {
          success: false,
          message: `Path is not a folder: ${currentPath}. Use moveFileTool for files.`,
        };
      }

      // Validate destination folder exists (unless it's root)
      if (destinationFolder && destinationFolder !== "") {
        const destFolder = app.vault.getAbstractFileByPath(destinationFolder);
        if (!destFolder) {
          return {
            success: false,
            message: `Destination folder not found: ${destinationFolder}. Create the folder first.`,
          };
        }
        if (!(destFolder instanceof TFolder)) {
          return {
            success: false,
            message: `Destination is not a folder: ${destinationFolder}`,
          };
        }

        // Prevent moving folder into itself or its children
        if (destinationFolder.startsWith(currentPath + "/") || destinationFolder === currentPath) {
          return {
            success: false,
            message: `Cannot move a folder into itself or its subfolders`,
          };
        }
      }

      // Build new path
      const newPath = destinationFolder ? `${destinationFolder}/${folder.name}` : folder.name;

      // Check if target already exists
      const existingFolder = app.vault.getAbstractFileByPath(newPath);
      if (existingFolder) {
        return {
          success: false,
          message: `A folder already exists at: ${newPath}`,
        };
      }

      await app.fileManager.renameFile(folder, newPath);

      logInfo(`[moveFolderTool] Moved ${currentPath} to ${newPath}`);
      new Notice(`Moved folder: ${folder.name} → ${destinationFolder || "root"}`);

      return {
        success: true,
        message: `Successfully moved folder to: ${newPath}`,
        newPath,
      };
    } catch (error) {
      logError("[moveFolderTool] Error:", error);
      return {
        success: false,
        message: `Failed to move folder: ${error.message}`,
      };
    }
  },
});

// ============================================================================
// DELETE FOLDER TOOL
// ============================================================================

const deleteFolderSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe("Vault-relative path to the folder to delete (e.g., 'Archive/OldProject')"),
  useSystemTrash: z
    .boolean()
    .optional()
    .describe(
      "If true, move to system trash (recoverable). If false, delete permanently. Default: true"
    ),
});

export const deleteFolderTool: SimpleTool<
  typeof deleteFolderSchema,
  { success: boolean; message: string }
> = createTool({
  name: "deleteFolder",
  description:
    "Delete a folder and all its contents from the vault. By default, moves to system trash.",
  schema: deleteFolderSchema,
  handler: async ({ path, useSystemTrash = true }) => {
    try {
      const folder = app.vault.getAbstractFileByPath(path);

      if (!folder) {
        return {
          success: false,
          message: `Folder not found: ${path}`,
        };
      }

      if (!(folder instanceof TFolder)) {
        return {
          success: false,
          message: `Path is not a folder: ${path}. Use deleteFileTool for files.`,
        };
      }

      const folderName = folder.name;
      const childCount = folder.children?.length || 0;

      if (useSystemTrash) {
        await app.vault.trash(folder, true);
        logInfo(`[deleteFolderTool] Trashed ${path} (${childCount} items)`);
        new Notice(`Moved to trash: ${folderName} (${childCount} items)`);
      } else {
        // For permanent deletion, we need to delete recursively
        await app.vault.delete(folder, true);
        logInfo(`[deleteFolderTool] Permanently deleted ${path} (${childCount} items)`);
        new Notice(`Permanently deleted: ${folderName} (${childCount} items)`);
      }

      return {
        success: true,
        message: useSystemTrash
          ? `Successfully moved to trash: ${path} (${childCount} items)`
          : `Successfully deleted permanently: ${path} (${childCount} items)`,
      };
    } catch (error) {
      logError("[deleteFolderTool] Error:", error);
      return {
        success: false,
        message: `Failed to delete folder: ${error.message}`,
      };
    }
  },
});

// ============================================================================
// CREATE FOLDER TOOL
// ============================================================================

const createFolderSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe("Vault-relative path for the new folder (e.g., 'Projects/NewProject')"),
});

export const createFolderTool: SimpleTool<
  typeof createFolderSchema,
  { success: boolean; message: string; path?: string }
> = createTool({
  name: "createFolder",
  description:
    "Create a new folder in the vault. Parent folders will be created automatically if needed.",
  schema: createFolderSchema,
  handler: async ({ path }) => {
    try {
      // Check if folder already exists
      const existingFolder = app.vault.getAbstractFileByPath(path);
      if (existingFolder) {
        if (existingFolder instanceof TFolder) {
          return {
            success: false,
            message: `Folder already exists: ${path}`,
          };
        } else {
          return {
            success: false,
            message: `A file with this name already exists: ${path}`,
          };
        }
      }

      await app.vault.createFolder(path);

      logInfo(`[createFolderTool] Created folder: ${path}`);
      new Notice(`Created folder: ${path}`);

      return {
        success: true,
        message: `Successfully created folder: ${path}`,
        path,
      };
    } catch (error) {
      logError("[createFolderTool] Error:", error);
      return {
        success: false,
        message: `Failed to create folder: ${error.message}`,
      };
    }
  },
});
