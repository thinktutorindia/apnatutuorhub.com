// Standard Server Action contract — see docs/Phases.md §3

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function actionSuccess<T>(data?: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError<T = unknown>(error: string): ActionResult<T> {
  return { success: false, error };
}

export function actionFieldErrors<T = unknown>(
  fieldErrors: Record<string, string[] | undefined>
): ActionResult<T> {
  const cleaned: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.length) cleaned[field] = messages;
  }
  return {
    success: false,
    error: "Please fix the highlighted fields",
    fieldErrors: cleaned,
  };
}
