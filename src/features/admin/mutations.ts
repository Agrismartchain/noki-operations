export interface AdminMutationResult {
  status: "idle" | "success" | "error";
  resultId?: string;
  message?: string;
  statusCode?: number;
  apiCode?: string;
  correlationId?: string;
  fieldErrors?: Record<string, string[]>;
  refresh?: boolean;
}

export type StatefulMutationAction = (
  state: AdminMutationResult,
  formData: FormData,
) => Promise<AdminMutationResult>;

export interface MutationFeedbackLabels {
  saving: string;
  successTitle: string;
  errorTitle: string;
  correlationId: string;
}

export const idleMutationResult: AdminMutationResult = { status: "idle" };
