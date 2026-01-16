# License Bypass Status

## Completed ✅

### Core Bypass
- [x] **`src/plusUtils.ts`**: `checkIsPlusUser` now always returns `true`.
- [x] **`src/constants.ts`**: `isPlusUser` default setting changed to `true`.
- [x] **Chain Runners**: Removed license checks from `CopilotPlusChainRunner.ts` and `AutonomousAgentChainRunner.ts`.

### Tool Unlocking
- [x] **`toolExecution.ts`**: Removed `isPlusOnly` check, allowing all tools to execute.
- [x] **`SearchTools.ts`**: Removed `isPlusOnly: true` flag from `webSearchTool`.
- [x] **Model Managers**: Removed `plusExclusive` checks from `chatModelManager.ts` and `embeddingManager.ts`.

### Local Replacements (BYOK)
- [x] **PDF Parsing**: Implemented local `pdf-parse` in `FileParserManager.ts`.
- [x] **DOCX Parsing**: Implemented local `mammoth` in `FileParserManager.ts`.
- [x] **URL Fetching**: Implemented local fetch + `cheerio` + `turndown` in `Mention.ts`.
- [x] **YouTube**: Implemented local `youtube-transcript` in `Mention.ts`.

### Dependencies
- [x] Added `pdf-parse`, `mammoth`, `cheerio`, `turndown`, `youtube-transcript`.
- [x] Configured Jest environment to support new dependencies.

## Remaining / To Do 🚧

The following features still rely on `BrevilabsClient` (cloud):

1.  **Web Search**: `webSearchTool` in `src/tools/SearchTools.ts` calls `BrevilabsClient.webSearch`.
    *   *Recommendation:* Replace with a user-configurable API (Tavily, SerpAPI) or disable if no key provided.
2.  **Reranking**: `HybridRetriever` in `src/search/hybridRetriever.ts` calls `BrevilabsClient.rerank`.
    *   *Recommendation:* Remove reranking step or implement local reranker (e.g. transformers.js, though heavy).
3.  **Project Youtube**: `ProjectManager.ts` calls `BrevilabsClient.youtube4llm`.
    *   *Recommendation:* Update to use `youtube-transcript`.
4.  **Youtube Modal**: `YoutubeTranscriptModal.tsx` calls `BrevilabsClient.youtube4llm`.
    *   *Recommendation:* Update to use `youtube-transcript`.
