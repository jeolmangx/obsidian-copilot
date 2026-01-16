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

---

## What We're Doing (WIP - 2026-01-11)

### Token Counter Widget
Adding a token usage display widget to the chat UI. Shows estimated input/output tokens for each AI response.

**Current Status:** Using estimation fallback (chars ÷ 4) since Gemini API doesn't reliably report token usage.

**Files Modified:**

| File | Purpose |
|------|---------|
| `src/components/chat-components/TokenCounter.tsx` | The widget component - shows `~<1k` style display, tooltip shows ↑ input / ↓ output breakdown. Always visible. |
| `src/components/chat-components/ChatControls.tsx` | Parent component - passes `latestTokenUsage` prop to TokenCounter |
| `src/components/Chat.tsx` | Main chat component - tracks `latestTokenUsage` state, estimates tokens on AI message, restores on chat switch |
| `src/types/message.ts` | Contains `TokenUsage` interface (`inputTokens`, `outputTokens`, `totalTokens`) - already existed |

**Debug Logging Added:**

| File | Purpose |
|------|---------|
| `src/LLMProviders/chainRunner/LLMChainRunner.ts` | Logs `📤 LLM REQUEST` with full messages array being sent to AI |
| `src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts` | Logs `📤 COPILOT+ REQUEST` with full messages array for agent mode |

**How it works:**
1. When AI responds, `addMessage` callback estimates tokens: `inputTokens` from last user message, `outputTokens` from AI response
2. Stores in `latestTokenUsage` state
3. `useEffect` restores estimates when switching chats (looks at last AI message in history)
4. Widget always visible - shows `~—` when no data yet

**Known limitations:**
- Input estimate is only user message text, not system prompts or context
- This is intentional for consistency - API data was unreliable/zeros from Gemini

---

### Function Call Loop Fix (2026-01-11)
**Problem:** Gemini agent was calling tools repeatedly until hitting the 4-iteration limit instead of answering.

**Root Cause:** `GeminiModelAdapter` prompts emphasized tool execution but lacked clear termination signals.

**Fix:** Added strong termination instructions to `modelAdapter.ts`:
- **ONE AND DONE**: Each tool called at most once per request
- **ANSWER AFTER RESULTS**: Respond after receiving tool results
- **DON'T FISH FOR MORE**: Use first search results, don't call more tools
- **SIMPLE QUESTIONS = NO TOOLS**: Not every message needs tools

**File Modified:** `src/LLMProviders/chainRunner/utils/modelAdapter.ts` (GeminiModelAdapter class)

