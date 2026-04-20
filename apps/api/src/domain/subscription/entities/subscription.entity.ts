import type { AuditFields } from '@shared/kernel';
import { Entity, UniqueId, createAuditFields } from '@shared/kernel';
import type { TierKey } from '@academyflo/contracts';

export interface SubscriptionProps {
  academyId: string;
  trialStartAt: Date;
  trialEndAt: Date;
  paidStartAt: Date | null;
  paidEndAt: Date | null;
  tierKey: TierKey | null;
  pendingTierKey: TierKey | null;
  pendingTierEffectiveAt: Date | null;
  activeStudentCountSnapshot: number | null;
  manualNotes: string | null;
  paymentReference: string | null;
  audit: AuditFields;
}

export class Subscription extends Entity<SubscriptionProps> {
  private constructor(id: UniqueId, props: SubscriptionProps) {
    super(id, props);
  }

  static createTrial(params: {
    id: string;
    academyId: string;
    trialStartAt: Date;
    trialEndAt: Date;
  }): Subscription {
    return new Subscription(new UniqueId(params.id), {
      academyId: params.academyId,
      trialStartAt: params.trialStartAt,
      trialEndAt: params.trialEndAt,
      paidStartAt: null,
      paidEndAt: null,
      tierKey: null,
      pendingTierKey: null,
      pendingTierEffectiveAt: null,
      activeStudentCountSnapshot: null,
      manualNotes: null,
      paymentReference: null,
      audit: createAuditFields(),
    });
  }

  static reconstitute(id: string, props: SubscriptionProps): Subscription {
    return new Subscription(new UniqueId(id), props);
  }

  get academyId(): string {
    return this.props.academyId;
  }

  get trialStartAt(): Date {
    return this.props.trialStartAt;
  }

  get trialEndAt(): Date {
    return this.props.trialEndAt;
  }

  get paidStartAt(): Date | null {
    return this.props.paidStartAt;
  }

  get paidEndAt(): Date | null {
    return this.props.paidEndAt;
  }

  get tierKey(): TierKey | null {
    return this.props.tierKey;
  }

  get pendingTierKey(): TierKey | null {
    return this.props.pendingTierKey;
  }

  get pendingTierEffectiveAt(): Date | null {
    return this.props.pendingTierEffectiveAt;
  }

  get activeStudentCountSnapshot(): number | null {
    return this.props.activeStudentCountSnapshot;
  }

  get manualNotes(): string | null {
    return this.props.manualNotes;
  }

  get paymentReference(): string | null {
    return this.props.paymentReference;
  }

  get audit(): AuditFields {
    return this.props.audit;
  }
}
