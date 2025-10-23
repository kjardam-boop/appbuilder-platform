import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AIGenerationButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export const AIGenerationButton = ({
  onClick,
  isGenerating,
  label = "Generer med AI",
  loadingLabel = "Genererer...",
  variant = "outline",
  size = "default",
  className = "",
  disabled = false,
}: AIGenerationButtonProps) => {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isGenerating || disabled}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
};
