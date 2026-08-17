import { isValidSuiNSName, normalizeSuiNSName } from '@mysten/sui/utils';
import type { LinkRequest, ValidationOptions } from './types.js';
import { normalizeAndValidate } from './standards.js';

export const MAX_LABEL_BYTES = 63;
export const MAX_DOMAIN_BYTES = 235;

function bytes(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

/** Builds a forward-only SuiNS bridge name from caller-owned parent configuration. */
export function linkName(input: Pick<LinkRequest, 'standard' | 'code' | 'parentDomain'>, options?: ValidationOptions): { code: string; name: string } {
	const code = normalizeAndValidate(input.standard, input.code, options);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.standard)) {
		throw new Error(`Invalid standard label ${JSON.stringify(input.standard)}: use lowercase alphanumerics with internal hyphens only`);
	}
	if (bytes(code) > MAX_LABEL_BYTES) throw new Error(`Identifier label exceeds SuiNS's ${MAX_LABEL_BYTES}-byte limit`);
	if (bytes(input.standard) > MAX_LABEL_BYTES) throw new Error(`Standard label exceeds SuiNS's ${MAX_LABEL_BYTES}-byte limit`);
	if (!isValidSuiNSName(input.parentDomain)) throw new Error(`Invalid SuiNS parent domain: ${input.parentDomain}`);
	const parentDomain = normalizeSuiNSName(input.parentDomain, 'dot');
	const name = `${code}.${input.standard}.${parentDomain}`;
	if (bytes(name) > MAX_DOMAIN_BYTES) throw new Error(`Bridge name exceeds SuiNS's ${MAX_DOMAIN_BYTES}-byte limit`);
	if (!isValidSuiNSName(name)) throw new Error(`Invalid SuiNS bridge name: ${name}`);
	return { code, name };
}
