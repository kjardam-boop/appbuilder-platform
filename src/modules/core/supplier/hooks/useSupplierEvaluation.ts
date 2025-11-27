import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EvaluationService } from "../services/evaluationService";
import type { SupplierEvaluation } from "../types/evaluation.types";
import { toast } from "sonner";

export const useSupplierEvaluations = (projectId: string, supplierId: string) => {
  return useQuery({
    queryKey: ['supplier-evaluations', projectId, supplierId],
    queryFn: () => EvaluationService.getEvaluationsBySupplier(projectId, supplierId),
    enabled: !!projectId && !!supplierId,
  });
};

export const useEvaluationSummary = (projectId: string, supplierId: string) => {
  return useQuery({
    queryKey: ['evaluation-summary', projectId, supplierId],
    queryFn: () => EvaluationService.getEvaluationSummary(projectId, supplierId),
    enabled: !!projectId && !!supplierId,
  });
};

export const useAllEvaluationSummaries = (projectId: string) => {
  return useQuery({
    queryKey: ['all-evaluation-summaries', projectId],
    queryFn: () => EvaluationService.getAllEvaluationSummaries(projectId),
    enabled: !!projectId,
  });
};

export const useSaveEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evaluation: Partial<SupplierEvaluation>) =>
      EvaluationService.saveEvaluation(evaluation),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['supplier-evaluations', variables.project_id, variables.supplier_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['evaluation-summary', variables.project_id, variables.supplier_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['all-evaluation-summaries', variables.project_id],
      });
      toast.success('Evaluering lagret');
    },
    onError: (error) => {
      toast.error('Kunne ikke lagre evaluering: ' + error.message);
    },
  });
};

export const useCreatePortalInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, supplierId, email }: {
      projectId: string;
      supplierId: string;
      email: string;
    }) => EvaluationService.createPortalInvitation(projectId, supplierId, email),
    onSuccess: () => {
      toast.success('Invitasjon sendt');
      queryClient.invalidateQueries({ queryKey: ['portal-invitations'] });
    },
    onError: (error) => {
      toast.error('Kunne ikke sende invitasjon: ' + error.message);
    },
  });
};
