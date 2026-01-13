import { Coins } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TokenUsage } from "@/types/message";
import React from "react";

interface TokenCounterProps {
  tokenUsage: TokenUsage | null;
}

/**
 * Displays token usage from the latest AI response.
 * Shows estimated input tokens by default (formatted as ~5k, etc.).
 * On hover, shows input (↑) and output (↓) token breakdown.
 * Always visible - shows "—" when no data available.
 */
export const TokenCounter: React.FC<TokenCounterProps> = ({ tokenUsage }) => {
  const formatTokenCount = (count: number | undefined): string => {
    if (count === undefined || count === null) {
      return "—";
    }
    if (count < 1000) {
      return "<1k";
    }
    return `${Math.floor(count / 1000)}k`;
  };

  // Display input tokens if available, fall back to total
  const displayValue = tokenUsage?.inputTokens ?? tokenUsage?.totalTokens;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-faint">
          <Coins className="tw-size-3" />
          <span>~{formatTokenCount(displayValue)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="tw-flex tw-flex-col tw-gap-0.5">
          <span>↑ ~{tokenUsage?.inputTokens?.toLocaleString() ?? "—"}</span>
          <span>↓ ~{tokenUsage?.outputTokens?.toLocaleString() ?? "—"}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
