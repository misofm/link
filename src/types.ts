import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import type { PackageInfo } from '@mysten/suins';
import type { Signer } from '@mysten/sui/cryptography';

/** Keeps the shipped standards ergonomic while permitting bridge-specific labels. */
export type Standard = 'isrc' | 'iswc' | 'upc' | 'ipi' | 'isni' | (string & {});

export type KnownStandard = 'isrc' | 'iswc' | 'upc' | 'ipi' | 'isni';

export interface StandardDefinition {
	label: KnownStandard;
	objectType: 'Recording' | 'Composition' | 'Release' | 'Party';
	normalize(code: string): string;
	validate(code: string, options?: ValidationOptions): void;
}

export interface ValidationOptions {
	/** Also check published check digits when the standard defines one. */
	strict?: boolean;
}

export interface ParentRef {
	/** The SuinsRegistration or SubDomainRegistration object ID / transaction argument. */
	parent: string | TransactionObjectArgument;
	/** Root below the standard node, for example `link.example.sui`. */
	parentDomain: string;
}

/** SuiNS deployment configuration, including the nested-subdomain proxy package. */
export type LinkConfig = PackageInfo;

export interface LinkRequest extends ParentRef {
	standard: Standard;
	code: string;
}

export interface RegisterRequest extends LinkRequest {
	target: string;
}

export interface ResolvedLink {
	address: string;
	standard: Standard;
	code: string;
	name: string;
}

export type LinkTransactionThunk = (transaction: Transaction) => TransactionObjectArgument;

export type LinkSigner = Signer;
