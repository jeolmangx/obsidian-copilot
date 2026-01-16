# License Bypass Implementation Plan

## Overview
Remove Copilot Plus license key requirements to unlock all features locally.

---

## Phase 1: Core Bypass (Required)

### 1.1 Always Return Plus User
**File:** `src/plusUtils.ts` (line ~40)

```diff
 export async function checkIsPlusUser(context?: Record<string, any>): Promise<boolean | undefined> {
-  if (!getSettings().plusLicenseKey) {
-    turnOffPlus();
-    return false;
-  }
-  const brevilabsClient = BrevilabsClient.getInstance();
-  const result = await brevilabsClient.validateLicenseKey(context);
-  return result.isValid;
+  return true; // Bypass license check
 }
```

### 1.2 Default isPlusUser to true
**File:** `src/constants.ts` (line ~751 in DEFAULT_SETTINGS)

```diff
- isPlusUser: undefined,
+ isPlusUser: true,
```

### 1.3 Remove Chain Runner License Gate
**File:** `src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts` (lines 754-772)

```diff
   async run(...) {
-    const isPlusUser = await checkIsPlusUser({
-      isCopilotPlus: true,
-    });
-    if (!isPlusUser) {
-      await this.handleError(
-        new Error("Invalid license key"),
-        thinkStreamer.processErrorChunk.bind(thinkStreamer)
-      );
-      // ... error handling
-    }
+    // License check removed
     
     try {
       // ... rest of run()
```

### 1.4 Remove Autonomous Agent License Gate
**File:** `src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts` (lines 238-253)

Same pattern as above - remove the `checkIsPlusUser` block.

---

## Phase 2: Tool Restrictions (Optional Cleanup)

### 2.1 Remove isPlusOnly Tool Check
**File:** `src/LLMProviders/chainRunner/utils/toolExecution.ts` (lines 51-61)

```diff
-    // Check if tool requires Plus subscription
-    if (tool.isPlusOnly) {
-      const isPlusUser = await checkIsPlusUser();
-      if (!isPlusUser) {
-        return {
-          toolName: toolCall.name,
-          result: `Error: ${getToolDisplayName(toolCall.name)} requires a Copilot Plus subscription`,
-          success: false,
-        };
-      }
-    }
```

### 2.2 Remove Model Exclusivity Gates
**File:** `src/LLMProviders/chatModelManager.ts` (line ~618)
```diff
-    if (model.plusExclusive && !settings.isPlusUser) {
-      // skip model
-    }
```

**File:** `src/LLMProviders/embeddingManager.ts` (line ~148)
```diff
-    if (customModel.plusExclusive && !getSettings().isPlusUser) {
-      // skip model
-    }
```

---

## Phase 3: Replace Brevilabs API Tools

These tools call Brevilabs cloud services. Replace with local/custom implementations:

| Tool | Location | Replacement Strategy |
|------|----------|---------------------|
| **Web Search** | `src/tools/SearchTools.ts:288` | Use MCP tool or custom API (Perplexity, SerpAPI, Tavily) |
| **YouTube Transcript** | `src/tools/YoutubeTools.ts:53` | Use `youtube-transcript` npm package or MCP |
| **URL Content** | `src/mentions/Mention.ts:47` | Simple fetch + html-to-markdown |
| **PDF Parsing** | `src/tools/FileParserManager.ts:47` | Use `pdf.js` or `pdf-parse` |
| **Docs Parsing** | `src/tools/FileParserManager.ts:232` | Use `mammoth` for docx, etc. |
| **Reranking** | `src/search/hybridRetriever.ts:101` | Remove or use local model |

---

## Quick Test Checklist

After changes:
- [ ] Copilot Plus chain works without license key
- [ ] Autonomous Agent mode works  
- [ ] @vault command works
- [ ] @web command works (after replacement)
- [ ] YouTube transcription works (after replacement)
- [ ] PDF indexing works (after replacement)

---

## Files Summary

| File | Changes |
|------|---------|
| `src/plusUtils.ts` | Bypass `checkIsPlusUser` |
| `src/constants.ts` | Default `isPlusUser: true` |
| `src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts` | Remove license check |
| `src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts` | Remove license check |
| `src/LLMProviders/chainRunner/utils/toolExecution.ts` | Remove `isPlusOnly` check |
| `src/LLMProviders/chatModelManager.ts` | Remove `plusExclusive` gate |
| `src/LLMProviders/embeddingManager.ts` | Remove `plusExclusive` gate |
| `src/tools/SearchTools.ts` | Replace web search |
| `src/tools/YoutubeTools.ts` | Replace YouTube API |
| `src/mentions/Mention.ts` | Replace URL fetching |
| `src/tools/FileParserManager.ts` | Replace PDF/docs parsing |
| `src/search/hybridRetriever.ts` | Replace or remove reranking |
