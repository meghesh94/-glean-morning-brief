export type UrgencyLevel = 'urgent' | 'attention' | 'followup' | 'fyi' | 'org';

export interface UrgencyFactors {
  blockingCount?: number;
  daysWaiting?: number;
  sprintRisk?: boolean;
  dueDate?: Date;
  isFollowUp?: boolean;
  isOrgSignal?: boolean;
}

export function calculateUrgency(factors: UrgencyFactors): UrgencyLevel {
  // Urgent: Blocking multiple people OR past due date OR high sprint risk
  if (factors.blockingCount && factors.blockingCount >= 2) {
    return 'urgent';
  }
  if (factors.dueDate && new Date(factors.dueDate) < new Date()) {
    return 'urgent';
  }
  if (factors.sprintRisk && factors.blockingCount && factors.blockingCount > 0) {
    return 'urgent';
  }

  // Attention: Blocking one person OR due soon OR waiting 2+ days
  if (factors.blockingCount === 1) {
    return 'attention';
  }
  if (factors.daysWaiting && factors.daysWaiting >= 2) {
    return 'attention';
  }
  if (factors.dueDate) {
    const daysUntilDue = Math.floor((new Date(factors.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 2 && daysUntilDue > 0) {
      return 'attention';
    }
  }

  // Follow-up: From transcripts or previous commitments
  if (factors.isFollowUp) {
    return 'followup';
  }

  // Org: Team health signals
  if (factors.isOrgSignal) {
    return 'org';
  }

  // Default: FYI
  return 'fyi';
}

