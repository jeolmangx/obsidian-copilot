
import { z } from "zod";
import { createTool } from "./SimpleTool";
import { TFile } from "obsidian";

const analyzeImageSchema = z.object({
  path: z.string().describe("The exact vault path to the image file (e.g., 'Attachments/screenshot.png')"),
});

export const createAnalyzeImageTool = (vault: any) =>
  createTool({
    name: "analyzeImage",
    description: "Analyze an image from the vault by path",
    schema: analyzeImageSchema,
    handler: async ({ path }: { path: string }) => {
      const file = vault.getAbstractFileByPath(path);

      if (!file) {
        throw new Error(`Image file not found: ${path}. Please use getFileTree to verify the path.`);
      }

      if (!(file instanceof TFile)) {
        throw new Error(`Path is not a file: ${path}`);
      }

      const extension = file.extension.toLowerCase();
      const validExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];
      if (!validExtensions.includes(extension)) {
         throw new Error(`Unsupported image format: ${extension}. Supported: ${validExtensions.join(", ")}`);
      }

      // Return just the path - the ChainRunner will inject the image content into the request
      // This is cleaner than returning markdown and parsing it back out
      return path;
    },
  });
