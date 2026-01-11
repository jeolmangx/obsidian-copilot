# Changelog

All notable changes to this fork will be documented in this file.

## [Unreleased] - 2026-01-10

### Added

#### File Manipulation Tools
Added 7 new tools for file and folder operations. All are user-toggleable in Settings → Copilot → Agent Tools.

| Tool | Description |
|------|-------------|
| **renameFile** | Rename a file while keeping it in the same folder |
| **moveFile** | Move a file to a different folder |
| **deleteFile** | Delete a file (moves to system trash by default) |
| **renameFolder** | Rename a folder |
| **moveFolder** | Move a folder to a different parent location |
| **deleteFolder** | Delete a folder and all its contents |
| **createFolder** | Create a new folder (auto-creates parent folders) |
| **analyzeImage** | **[NEW]** Analyze images from the vault by filepath |

**Files added:**
- `src/tools/FileManipulationTools.ts` - Tool implementations with Zod schemas
- `src/tools/ImageTools.ts` - Image analysis tool implementation

**Files modified:**
- `src/tools/builtinTools.ts` - Added imports and tool registrations with metadata/prompt instructions

**Features:**
- All delete operations use system trash by default (recoverable)
- User notifications via Obsidian `Notice` for all operations
- Comprehensive error handling with descriptive messages
- Each tool has `customPromptInstructions` with XML examples for LLM guidance
- Tools are NOT marked as `isAlwaysEnabled`, so users must explicitly enable them in settings

---

### Changed

- **Delete operations** now use Obsidian's `.trash` folder instead of system trash
- **Image handling** (`isMultimodalModel`) now auto-detects attached images and forces multimodal mode, bypassing the VISION capability check

---

### Fixed

- **Gemini 3 Vision Support:** Fixed "This model does not support images" error by updating Google provider to use `v1beta` API endpoint.
- **New Models:** Added support for `gemini-3-pro-preview` and `gemini-3-flash-preview` to built-in model list.

---

*This fork is based on [obsidian-copilot](https://github.com/logancyang/obsidian-copilot) by Logan Yang.*

### Fixed (Gemini 3 Updates - 2026-01-10)
- **Gemini 3 Image Support**: Fixed "This model does not support images" error for `gemini-3-flash-preview` and `gemini-3-pro-preview`.
    - Implemented `GeminiChatModel` subclass to override strict `@langchain/google-genai` model name validation.
    - Updated `chatModelManager.ts` to use `GeminiChatModel`.
- **Gemini 3 Thinking Support**: Added `gemini-3-flash` and `gemini-3-pro` to `isThinkingEnabled` logic to support partial reasoning/thinking mode (suppressing temperature).
