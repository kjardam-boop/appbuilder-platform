import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  questionId: string;
  questionText: string;
  placeholder?: string;
  maxLength?: number;
  isRequired: boolean;
  value: string;
  onChange: (value: string) => void;
  displayOrder: number;
}

export const QuestionCard = ({
  questionId,
  questionText,
  placeholder,
  maxLength = 500,
  isRequired,
  value,
  onChange,
  displayOrder,
}: QuestionCardProps) => {
  return (
    <div className="space-y-2 p-4 border rounded-lg bg-card">
      <div className="flex items-start justify-between">
        <Label htmlFor={questionId} className="text-base font-medium">
          {displayOrder}. {questionText}
        </Label>
        {isRequired && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Påkrevd
          </Badge>
        )}
      </div>
      <Textarea
        id={questionId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="min-h-[100px] resize-none"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value.length} / {maxLength} tegn</span>
      </div>
    </div>
  );
};
