import type { KnownStandard, Standard, StandardDefinition, ValidationOptions } from './types.js';

const separators = /[^a-z0-9]/gi;

/** Cosmetic punctuation is removed before any bridge name is created. */
export function normalizeCode(code: string): string {
	return code.toLowerCase().replace(separators, '');
}

function invalid(standard: string, detail: string): never {
	throw new Error(`Invalid ${standard.toUpperCase()} code: ${detail}`);
}

function gtinCheck(value: string): boolean {
	let sum = 0;
	const body = value.slice(0, -1);
	for (let index = body.length - 1, weight = 3; index >= 0; index--, weight = weight === 3 ? 1 : 3) {
		sum += Number(body[index]) * weight;
	}
	return (10 - (sum % 10)) % 10 === Number(value.at(-1));
}

function iswcCheck(value: string): boolean {
	// ISO 15707 includes the prefix with value/weight 1, then weights the nine work digits 1..9.
	let sum = 1;
	for (let index = 1; index <= 9; index++) sum += Number(value[index]) * index;
	return (10 - (sum % 10)) % 10 === Number(value[10]);
}

function isniCheck(value: string): boolean {
	let total = 0;
	for (const character of value.slice(0, 15)) total = (total + Number(character)) * 2;
	const remainder = total % 11;
	const expected = remainder === 1 ? 'x' : String((12 - remainder) % 11);
	return value[15] === expected;
}

const definitions: Record<KnownStandard, StandardDefinition> = {
	isrc: {
		label: 'isrc', objectType: 'Recording', normalize: normalizeCode,
		// IFPI ISRC syntax: https://isrc.ifpi.org/isrc-standard/isrc-structure
		validate(code) { if (!/^[a-z]{2}[a-z0-9]{3}\d{7}$/.test(code)) invalid('isrc', 'expected 2 letters, 3 alphanumerics, 2-digit year, and 5 digits'); },
	},
	iswc: {
		label: 'iswc', objectType: 'Composition', normalize: normalizeCode,
		// ISO 15707:2022 / ISWC: https://www.iswc.org/iswc
		validate(code, options) { if (!/^t\d{10}$/.test(code)) invalid('iswc', 'expected T followed by 10 digits'); if (code.slice(1, 10) === '000000000') invalid('iswc', 'work identifier must be between 000000001 and 999999999'); if (options?.strict && !iswcCheck(code)) invalid('iswc', 'check digit does not match'); },
	},
	upc: {
		label: 'upc', objectType: 'Release', normalize: normalizeCode,
		// GS1 Mod-10 algorithm: https://www.gs1.org/services/how-calculate-check-digit-manually
		validate(code, options) { if (!/^\d{12,14}$/.test(code)) invalid('upc', 'expected 12, 13, or 14 digits'); if (options?.strict && !gtinCheck(code)) invalid('upc', 'GTIN check digit does not match'); },
	},
	ipi: {
		label: 'ipi', objectType: 'Party', normalize: normalizeCode,
		// CISAC IPI system: https://www.ipisystem.org/
		validate(code) { if (!/^\d{9}(\d{2})?$/.test(code)) invalid('ipi', 'expected 9 or 11 digits'); },
	},
	isni: {
		label: 'isni', objectType: 'Party', normalize: normalizeCode,
		// ISO 27729 / ISNI: https://isni.org/page/isni-standard/
		validate(code, options) { if (!/^\d{15}[\dx]$/.test(code)) invalid('isni', 'expected 15 digits followed by a digit or X'); if (options?.strict && !isniCheck(code)) invalid('isni', 'MOD 11-2 check digit does not match'); },
	},
};

export const standards: Readonly<Record<KnownStandard, StandardDefinition>> = definitions;

export function getStandard(standard: Standard): StandardDefinition | undefined {
	return definitions[standard as KnownStandard];
}

export function normalizeAndValidate(standard: Standard, code: string, options?: ValidationOptions): string {
	const normalized = normalizeCode(code);
	const definition = getStandard(standard);
	if (definition) definition.validate(normalized, options);
	else if (!/^[a-z0-9-]+$/.test(normalized)) invalid(standard, 'must normalize to lowercase alphanumerics');
	return normalized;
}
