import type { Subscription } from '@domain/subscription/entities/subscription.entity';
import type { SubscriptionEvaluation } from '@domain/subscription/rules/subscription.rules';
import { evaluateSubscriptionStatus } from '@domain/subscription/rules/subscription.rules';

/**
 * Thin orchestrator that delegates to the domain rule.
 * Exists so that guards/controllers call application layer, not domain directly.
 */
export function evaluateStatus(
  now: Date,
  academyLoginDisabled: boolean,
  subscription: Subscription,
): SubscriptionEvaluation {
  return evaluateSubscriptionStatus(now, academyLoginDisabled, subscription);
}
