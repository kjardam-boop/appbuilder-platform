import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SupplierQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupplierQuestionnaireDialog = ({
  open,
  onOpenChange,
}: SupplierQuestionnaireDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supplier Questionnaire</DialogTitle>
          <DialogDescription>
            Database not configured. This feature requires migration.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
