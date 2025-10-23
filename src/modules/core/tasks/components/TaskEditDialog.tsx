// Temporary stub component to satisfy props during refactor

type TaskEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onUpdated: () => void;
};

export const TaskEditDialog = ({ open, onOpenChange, task, onUpdated }: TaskEditDialogProps) => {
  return null;
};
