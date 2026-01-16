# Thanos Plan: Complete Plus Removal

> *"I am inevitable."* - Remove all traces of licensing from the plugin.

---

## Phase 1: Delete These Files

```
src/plusUtils.ts
src/LLMProviders/brevilabsClient.ts
src/components/modals/CopilotPlusExpiredModal.tsx
src/components/modals/CopilotPlusWelcomeModal.tsx
src/settings/v2/components/PlusSettings.tsx
src/settings/v2/components/CopilotPlusSettings.tsx
```

---

## Phase 2: Constants & Settings Cleanup

### `src/constants.ts`
- [ ] Delete `BREVILABS_API_BASE_URL`
- [ ] Delete `BREVILABS_MODELS_BASE_URL`
- [ ] Remove all models with `plusExclusive: true`
- [ ] Remove `plusLicenseKey` from `DEFAULT_SETTINGS`
- [ ] Remove `PlusUtmMedium` enum

### `src/settings/model.ts`
- [ ] Remove `isPlusUser` from settings interface
- [ ] Remove `plusLicenseKey` from settings interface

### `src/aiParams.ts`
- [ ] Remove `plusExclusive` from CustomModel interface

---

## Phase 3: Chain Runner Surgery

### `src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts`
- [ ] Remove import of `checkIsPlusUser`
- [ ] Delete license check block (lines ~754-772)
- [ ] Keep all the actual chain logic

### `src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts`
- [ ] Remove import of `checkIsPlusUser`
- [ ] Delete license check block (lines ~238-253)

### `src/LLMProviders/chainRunner/utils/toolExecution.ts`
- [ ] Remove import of `checkIsPlusUser`
- [ ] Delete `isPlusOnly` check block (lines ~51-61)

---

## Phase 4: Model Manager Cleanup

### `src/LLMProviders/chatModelManager.ts`
- [ ] Remove `BREVILABS_MODELS_BASE_URL` import
- [ ] Remove `plusExclusive` gate (line ~618)
- [ ] Remove Copilot Plus model creation logic (line ~326)

### `src/LLMProviders/embeddingManager.ts`
- [ ] Remove `BREVILABS_MODELS_BASE_URL` import
- [ ] Remove `plusExclusive` gate (line ~148)
- [ ] Remove `brevilabsClient` import and usage
- [ ] Remove Copilot Plus embedding logic

---

## Phase 5: UI Cleanup

### `src/settings/v2/SettingsMainV2.tsx`
- [ ] Remove "plus" from tabs
- [ ] Remove `CopilotPlusSettings` import

### `src/components/Chat.tsx`
- [ ] Remove `isPlusUser` conditionals
- [ ] Clean up chain type restrictions

### `src/components/chat-components/ChatControls.tsx`
- [ ] Remove Plus-related UI elements

### `src/components/modals/AddContextNoteModal.tsx`
- [ ] Remove Plus chain type defaults if any

---

## Phase 6: Tool Replacements

Replace Brevilabs API calls with local/MCP implementations:

| Original | File | Replace With |
|----------|------|--------------|
| `webSearch()` | `src/tools/SearchTools.ts:288` | MCP tool or custom API |
| `youtube4llm()` | `src/tools/YoutubeTools.ts:53` | `youtube-transcript` package or MCP |
| `url4llm()` | `src/mentions/Mention.ts:47` | fetch + html-to-markdown |
| `pdf4llm()` | `src/tools/FileParserManager.ts:47` | `pdf-parse` or `pdf.js` |
| `docs4llm()` | `src/tools/FileParserManager.ts:232` | `mammoth` for docx |
| `rerank()` | `src/search/hybridRetriever.ts:101` | Remove or local reranker |

---

## Phase 7: Import Cleanup

Files that need import updates after deletions:

```
src/main.ts
src/search/searchUtils.test.ts
src/search/hybridRetriever.ts
src/tools/SearchTools.ts
src/tools/YoutubeTools.ts
src/tools/FileParserManager.ts
src/mentions/Mention.ts
src/LLMProviders/projectManager.ts
src/LLMProviders/embeddingManager.ts
src/LLMProviders/chatModelManager.ts
src/LLMProviders/chainRunner/CopilotPlusChainRunner.ts
src/LLMProviders/chainRunner/AutonomousAgentChainRunner.ts
src/LLMProviders/chainRunner/utils/toolExecution.ts
src/settings/v2/SettingsMainV2.tsx
src/settings/v2/components/PlusSettings.tsx (deleted)
src/integration_tests/AgentPrompt.test.ts
src/encryptionService.ts
```

---

## Phase 8: Data Cleanup

### `data.json` (in plugin folder)
- Remove `plusLicenseKey`
- Remove `isPlusUser`

---

## Execution Order

1. **Create tool replacements first** (Phase 6) - so nothing breaks
2. **Delete files** (Phase 1)
3. **Fix all broken imports** (Phase 7)
4. **Clean constants/settings** (Phase 2)
5. **Surgery on chain runners** (Phase 3-4)
6. **UI cleanup** (Phase 5)
7. **Test everything**
8. **Clean data.json** (Phase 8)

---

## Post-Snap State

- Zero concept of "Plus" user
- All features available to everyone
- Your own models only
- Your own tool implementations
- Clean, maintainable fork

---

## Estimated Time

| Phase | Time |
|-------|------|
| Tool replacements | 4-8 hrs |
| File deletion + import fixes | 2-3 hrs |
| Chain/manager surgery | 1-2 hrs |
| UI cleanup | 1-2 hrs |
| Testing | 2 hrs |
| **Total** | **10-17 hrs** |
