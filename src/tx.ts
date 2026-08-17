import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { SuinsClient, SuinsTransaction } from '@mysten/suins';
import type { LinkConfig, LinkRequest, LinkTransactionThunk, RegisterRequest, ValidationOptions } from './types.js';
import { linkName } from './names.js';

type Client = ConstructorParameters<typeof SuinsClient>[0]['client'];

function suinsTransaction(client: Client, config: LinkConfig, transaction: Transaction): SuinsTransaction {
	return new SuinsTransaction(new SuinsClient({ client, network: client.network, packageInfo: config }), transaction);
}

function transactionParent(transaction: Transaction, parent: LinkRequest['parent']): TransactionObjectArgument {
	return typeof parent === 'string' ? transaction.object(parent) : parent;
}

export function registerTx(client: Client, config: LinkConfig, input: RegisterRequest, options?: ValidationOptions): LinkTransactionThunk {
	const { name } = linkName(input, options);
	return (transaction) => {
		suinsTransaction(client, config, transaction).createLeafSubName({ parentNft: input.parent, name, targetAddress: input.target });
		return transactionParent(transaction, input.parent);
	};
}

export function unregisterTx(client: Client, config: LinkConfig, input: LinkRequest, options?: ValidationOptions): LinkTransactionThunk {
	const { name } = linkName(input, options);
	return (transaction) => {
		suinsTransaction(client, config, transaction).removeLeafSubName({ parentNft: input.parent, name });
		return transactionParent(transaction, input.parent);
	};
}

/** Removal then creation in one PTB: no observer can see a gap between records. */
export function reassignTx(client: Client, config: LinkConfig, input: RegisterRequest, options?: ValidationOptions): LinkTransactionThunk {
	const remove = unregisterTx(client, config, input, options);
	const add = registerTx(client, config, input, options);
	return (tx) => { remove(tx); return add(tx); };
}

export function bulkRegisterTx(client: Client, config: LinkConfig, inputs: readonly RegisterRequest[], options?: ValidationOptions): LinkTransactionThunk {
	if (inputs.length === 0) throw new Error('Bulk registration requires at least one entry');
	if (inputs.length > 1_024) throw new Error('Bulk registration exceeds Sui\'s 1,024-command PTB limit');
	const builders = inputs.map((input) => registerTx(client, config, input, options));
	return (tx) => {
		let last!: TransactionObjectArgument;
		for (const build of builders) last = build(tx);
		return last;
	};
}
