import { ChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from "@langchain/google-genai";

/**
 * Extended Gemini Chat Model that overrides the strict model name validation
 * to support newer models like Gemini 3 that aren't yet in the LangChain allowlist.
 */
export class GeminiChatModel extends ChatGoogleGenerativeAI {
  constructor(fields: GoogleGenerativeAIChatInput) {
    super(fields);
    console.log("[GeminiChatModel] Initialized with model:", this.model);
    console.log("[GeminiChatModel] _isMultimodalModel:", this._isMultimodalModel);
  }

  /**
   * Override the strict check in the parent class.
   * The parent class checks for specific prefixes (gemini-1.5, gemini-2, etc.).
   * We add support for gemini-3.
   */
  get _isMultimodalModel(): boolean {
    return (
      this.model.includes("gemini-3") ||
      this.model.includes("vision") ||
      this.model.startsWith("gemini-1.5") ||
      this.model.startsWith("gemini-2") ||
      (this.model.startsWith("gemma-3-") && !this.model.startsWith("gemma-3-1b"))
    );
  }
}
