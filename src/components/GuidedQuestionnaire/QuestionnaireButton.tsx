import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

interface QuestionnaireButtonProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const QuestionnaireButton = ({ 
  onClick, 
  className = "",
  children = "Svar på spørsmål"
}: QuestionnaireButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={className}
    >
      <MessageSquarePlus className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
};
