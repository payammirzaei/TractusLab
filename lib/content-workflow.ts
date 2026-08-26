export type ContentRole = "learner" | "author" | "reviewer" | "admin";
export type ContentStatus = "draft" | "in_review" | "approved" | "changes_requested" | "published" | "archived";

export const workflowStages = ["Draft", "Review", "Approved", "Published"] as const;

export function canAccessContent(role: ContentRole): boolean {
  return role === "author" || role === "reviewer" || role === "admin";
}

export function canAuthor(role: ContentRole): boolean {
  return role === "author" || role === "admin";
}

export function canReview(role: ContentRole): boolean {
  return role === "reviewer" || role === "admin";
}

export function canPublish(role: ContentRole): boolean {
  return role === "admin";
}

export function workflowStageIndex(status: ContentStatus): number {
  if (status === "published" || status === "archived") return 3;
  if (status === "approved") return 2;
  if (status === "in_review") return 1;
  return 0;
}

export function statusLabel(status: ContentStatus): string {
  const labels: Record<ContentStatus, string> = {
    draft: "Draft",
    in_review: "In review",
    approved: "Approved",
    changes_requested: "Changes requested",
    published: "Published",
    archived: "Archived",
  };
  return labels[status];
}

export function nextActionLabel(status: ContentStatus, role: ContentRole): string {
  if ((status === "draft" || status === "changes_requested") && canAuthor(role)) return "Submit for review";
  if (status === "in_review" && canReview(role)) return "Review revision";
  if (status === "approved" && canPublish(role)) return "Publish revision";
  if (status === "published" && canAuthor(role)) return "Create next revision";
  return "Waiting for another role";
}
