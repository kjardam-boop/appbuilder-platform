import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface QuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  fieldKey: string;
  onComplete: (generatedText: string) => void;
}

export const QuestionnaireDialog = ({
  open,
  onOpenChange,
}: QuestionnaireDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Questionnaire</DialogTitle>
          <DialogDescription>
            Database not configured. This feature requires migration.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
