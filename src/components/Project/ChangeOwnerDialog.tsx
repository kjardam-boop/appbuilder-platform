// Minimal stub to satisfy imports during refactor
import React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentOwnerId: string;
  companyId: string;
  onOwnerChanged: () => void;
};

export function ChangeOwnerDialog({ open, onOpenChange, projectId, currentOwnerId, companyId, onOwnerChanged }: Props) {
  return null;
}
