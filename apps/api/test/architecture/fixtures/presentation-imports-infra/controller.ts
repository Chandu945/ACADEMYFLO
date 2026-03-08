// Fixture: controller illegally importing infrastructure directly
import { REPO_IMPL } from './infra';

export const CONTROLLER_VALUE = `controller-uses-${REPO_IMPL}`;
