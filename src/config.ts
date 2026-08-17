import { mainPackage } from '@mysten/suins';
import type { LinkConfig } from './types.js';

/** Deployment IDs are data: pass an override when SuiNS upgrades its package. */
export const TESTNET_LINK_CONFIG: LinkConfig = mainPackage.testnet;

/** Mainnet is deliberately explicit/configurable; verify IDs at deployment time. */
export const MAINNET_LINK_CONFIG: LinkConfig = mainPackage.mainnet;
