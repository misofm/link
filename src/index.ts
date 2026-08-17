import { Transaction } from '@mysten/sui/transactions';
import { MAINNET_LINK_CONFIG, TESTNET_LINK_CONFIG } from './config.js';
import { linkName } from './names.js';
import { bulkRegisterTx, reassignTx, registerTx, unregisterTx } from './tx.js';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { LinkConfig, LinkRequest, LinkSigner, LinkTransactionThunk, RegisterRequest, ResolvedLink, Standard, ValidationOptions } from './types.js';

export * from './config.js';
export * from './names.js';
export * from './standards.js';
export * from './types.js';

export interface MisoLinkOptions {
	/** The caller-controlled namespace below each standard node, e.g. `link.example.sui`. */
	parentDomain: string;
	config?: LinkConfig;
	network?: 'testnet' | 'mainnet';
	validation?: ValidationOptions;
}

function configured(options: MisoLinkOptions, client: ClientWithCoreApi): LinkConfig {
	if (options.config) return options.config;
	if (options.network && options.network !== client.network) {
		throw new Error(`Miso Link network ${options.network} does not match client network ${client.network}`);
	}
	const network = options.network ?? client.network;
	if (network === 'mainnet') return MAINNET_LINK_CONFIG;
	if (network === 'testnet') return TESTNET_LINK_CONFIG;
	throw new Error(`Miso Link requires an explicit config for network ${network}`);
}

/** Modern client extension backed by SuiNS leaf subnames. */
export function misoLink(options: MisoLinkOptions) {
	const withParent = <T extends Omit<LinkRequest, 'parentDomain'>>(input: T): T & { parentDomain: string } => ({ ...input, parentDomain: options.parentDomain });
	return {
		name: 'link' as const,
		register(client: ClientWithCoreApi) {
			const config = configured(options, client);
			const resolve = async (standard: Standard, code: string): Promise<ResolvedLink | null> => {
				const built = linkName({ standard, code, parentDomain: options.parentDomain }, options.validation);
				const { address } = await client.core.resolveNameServiceAddress({ name: built.name });
				return address ? { address, standard, code: built.code, name: built.name } : null;
			};
			const execute = async (build: LinkTransactionThunk, signer: LinkSigner) => {
				const transaction = new Transaction();
				transaction.add(build);
				const result = await signer.signAndExecuteTransaction({ transaction, client });
				const executed = result.Transaction ?? result.FailedTransaction;
				if (!executed.status.success) {
					throw new Error(`Miso Link transaction failed: ${executed.status.error?.message ?? 'unknown execution error'}`);
				}
				await client.core.waitForTransaction({ result });
				return result;
			};
			return {
				resolve,
				register: (input: Omit<RegisterRequest, 'parentDomain'>, { signer }: { signer: LinkSigner }) => execute(registerTx(client, config, withParent(input), options.validation), signer),
				reassign: (input: Omit<RegisterRequest, 'parentDomain'>, { signer }: { signer: LinkSigner }) => execute(reassignTx(client, config, withParent(input), options.validation), signer),
				unregister: (input: Omit<LinkRequest, 'parentDomain'>, { signer }: { signer: LinkSigner }) => execute(unregisterTx(client, config, withParent(input), options.validation), signer),
				tx: {
					register: (input: Omit<RegisterRequest, 'parentDomain'>) => registerTx(client, config, withParent(input), options.validation),
					reassign: (input: Omit<RegisterRequest, 'parentDomain'>) => reassignTx(client, config, withParent(input), options.validation),
					unregister: (input: Omit<LinkRequest, 'parentDomain'>) => unregisterTx(client, config, withParent(input), options.validation),
					bulkRegister: (inputs: readonly Omit<RegisterRequest, 'parentDomain'>[]) => bulkRegisterTx(client, config, inputs.map(withParent), options.validation),
				},
			};
		},
	};
}
