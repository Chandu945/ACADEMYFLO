// Fixture: domain file illegally importing from infrastructure
import { INFRA_VALUE } from './infra';

export const DOMAIN_VALUE = `domain-uses-${INFRA_VALUE}`;
