import type { Subscription } from '../entities/subscription.entity';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');

export interface SubscriptionRepository {
  /**
   * Optimistic-concurrency save. The implementation conditions the write
   * on the persisted `version` matching `subscription.audit.version - 1`
   * (the previous version), and throws `ConcurrentModificationError` on
   * mismatch. Callers that mutate concurrently-edited state (admin manual
   * adjustments, webhook activations) should catch the CMC and map it to
   * a typed CONFLICT — see set-subscription-manual / deactivate-subscription
   * (M2 admin audit fix).
   */
  save(subscription: Subscription): Promise<void>;
  findByAcademyId(academyId: string): Promise<Subscription | null>;
}
