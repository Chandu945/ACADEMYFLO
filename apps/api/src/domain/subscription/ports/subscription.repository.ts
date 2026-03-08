import type { Subscription } from '../entities/subscription.entity';

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');

export interface SubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findByAcademyId(academyId: string): Promise<Subscription | null>;
}
