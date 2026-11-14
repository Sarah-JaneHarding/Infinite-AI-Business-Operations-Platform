import { executive, product, curriculum, aibrain } from './d1';
import { security, legal, finance, sales } from './d2';
import { marketing, success, support, government } from './d3';
import { people, devops, procurement, research } from './d4';
import type { Department } from './types';
import { makeOpsReview } from './ceoReview';

export const DEPARTMENTS: Department[] = [executive, product, curriculum, aibrain, security, legal, finance, sales, marketing, success, support, government, people, devops, procurement, research];
export const AGENTS = DEPARTMENTS.flatMap((d) => d.agents);
/** Platform service agents: real contracts, run through the same gateway and approval rules, but outside the 100-agent roster (decision OQ-005). */
export const SERVICE_AGENTS = [makeOpsReview(DEPARTMENTS)];
export const agentById = (id: string) => AGENTS.find((a) => a.id === id) ?? SERVICE_AGENTS.find((a) => a.id === id);
export const deptById = (id: string) => DEPARTMENTS.find((d) => d.id === id);
