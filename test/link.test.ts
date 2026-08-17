import { describe, expect, test } from 'bun:test';
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { MAINNET_LINK_CONFIG, TESTNET_LINK_CONFIG, linkName, misoLink, normalizeAndValidate } from '../src/index.js';

const parent = '0x123';
const parentDomain = 'link.example.sui';

describe('normalization and standards', () => {
	test('strips every cosmetic separator', () => {
		expect(normalizeAndValidate('isrc', 'US-NAG-24-98535')).toBe('usnag2498535');
		expect(normalizeAndValidate('iswc', 'T-123.456.789-0')).toBe('t1234567890');
	});
	test('validates each registered standard', () => {
		expect(() => normalizeAndValidate('isrc', 'US-NAG-24-98535')).not.toThrow();
		expect(() => normalizeAndValidate('iswc', 'T-123.456.789-0')).not.toThrow();
		expect(() => normalizeAndValidate('upc', '0602448048998')).not.toThrow();
		expect(() => normalizeAndValidate('ipi', '123456789')).not.toThrow();
		expect(() => normalizeAndValidate('isni', '0000000121032683')).not.toThrow();
		expect(() => normalizeAndValidate('isrc', 'too-short')).toThrow('ISRC');
		expect(() => normalizeAndValidate('iswc', 'T123')).toThrow('ISWC');
		expect(() => normalizeAndValidate('upc', '123')).toThrow('UPC');
		expect(() => normalizeAndValidate('ipi', '1234')).toThrow('IPI');
		expect(() => normalizeAndValidate('isni', '123')).toThrow('ISNI');
	});

	test('uses each standards body check-digit algorithm in strict mode', () => {
		expect(normalizeAndValidate('iswc', 'T-034.524.680-1', { strict: true })).toBe('t0345246801');
		expect(() => normalizeAndValidate('iswc', 'T-034.524.680-2', { strict: true })).toThrow('check digit');
		expect(() => normalizeAndValidate('iswc', 'T-000.000.000-9')).toThrow('000000001');
		expect(normalizeAndValidate('upc', '0602448048998', { strict: true })).toBe('0602448048998');
		expect(() => normalizeAndValidate('upc', '0602448048997', { strict: true })).toThrow('check digit');
		expect(normalizeAndValidate('isni', '0000 0001 2103 2683', { strict: true })).toBe('0000000121032683');
		expect(() => normalizeAndValidate('isni', '0000 0001 2103 2684', { strict: true })).toThrow('check digit');
	});
});

describe('names', () => {
	test('places the standard between code and caller-configured parent domain', () => {
		expect(linkName({ parentDomain, standard: 'isrc', code: 'US-NAG-24-98535' })).toEqual({ code: 'usnag2498535', name: 'usnag2498535.isrc.link.example.sui' });
		expect(linkName({ parentDomain, standard: 'upc', code: '0602448048998' }).name).toBe('0602448048998.upc.link.example.sui');
	});

	test('enforces label and full-domain byte limits at their boundaries', () => {
		const parentAt235 = `${'p'.repeat(63)}.${'q'.repeat(63)}.${'r'.repeat(32)}.sui`;
		const parentAt236 = `${'p'.repeat(63)}.${'q'.repeat(63)}.${'r'.repeat(33)}.sui`;
		expect(linkName({ parentDomain: parentAt235, standard: 'custom', code: 'a'.repeat(63) }).name.length).toBe(235);
		expect(() => linkName({ parentDomain, standard: 'custom', code: 'a'.repeat(64) })).toThrow('63-byte');
		expect(() => linkName({ parentDomain: parentAt236, standard: 'custom', code: 'a'.repeat(63) })).toThrow('235-byte');
		expect(() => linkName({ parentDomain, standard: 'a'.repeat(64), code: 'a' })).toThrow('63-byte');
		expect(() => linkName({ parentDomain, standard: '-custom', code: 'a' })).toThrow('internal hyphens');
	});
});

describe('transactions', () => {
	const extension = misoLink({ parentDomain, config: TESTNET_LINK_CONFIG });
	const link = extension.register({ network: 'testnet', core: { resolveNameServiceAddress: async () => ({ address: null }) } } as never);
	const input = { parent, standard: 'isrc' as const, code: 'US-NAG-24-98535', target: '0x456' };

	test('writes nested leaves through the proxy in documented argument order', () => {
		const tx = new Transaction();
		link.tx.register(input)(tx);
		const data = tx.getData();
		const command = data.commands[0]!;
		expect(command.$kind).toBe('MoveCall');
		if (command.$kind !== 'MoveCall') throw new Error('expected MoveCall');
		expect(`${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`).toBe(`${TESTNET_LINK_CONFIG.tempSubdomainsProxyPackageId}::subdomain_proxy::new_leaf`);
		expect(command.MoveCall.arguments.map((argument) => argument.$kind === 'Input' ? argument.Input : -1)).toEqual([0, 1, 2, 3, 4]);
		const inputs = data.inputs;
		expect(inputs[0]?.$kind === 'UnresolvedObject' && inputs[0].UnresolvedObject.objectId).toBe(TESTNET_LINK_CONFIG.suins);
		expect(inputs[1]?.$kind === 'UnresolvedObject' && inputs[1].UnresolvedObject.objectId.endsWith('0123')).toBe(true);
		expect(inputs[2]?.$kind === 'UnresolvedObject' && inputs[2].UnresolvedObject.objectId.endsWith('0006')).toBe(true);
		expect(inputs[3]?.$kind === 'Pure' && bcs.String.parse(fromBase64(inputs[3].Pure.bytes))).toBe('usnag2498535.isrc.link.example.sui');
		expect(inputs[4]?.$kind === 'Pure' && bcs.Address.parse(fromBase64(inputs[4].Pure.bytes)).endsWith('0456')).toBe(true);
	});

	test('reassignment is remove then new_leaf in one PTB', () => {
		const tx = new Transaction();
		link.tx.reassign(input)(tx);
		const targets = tx.getData().commands.map((command) => command.$kind === 'MoveCall' ? `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}` : undefined);
		expect(targets).toEqual([
			`${TESTNET_LINK_CONFIG.tempSubdomainsProxyPackageId}::subdomain_proxy::remove_leaf`,
			`${TESTNET_LINK_CONFIG.tempSubdomainsProxyPackageId}::subdomain_proxy::new_leaf`,
		]);
	});

	test('builds more than fifty catalog registrations in one PTB', () => {
		const tx = new Transaction();
		link.tx.bulkRegister(Array.from({ length: 51 }, (_, index) => ({ ...input, code: `USNAG24${String(index).padStart(5, '0')}` })))(tx);
		expect(tx.getData().commands).toHaveLength(51);
		expect(() => link.tx.bulkRegister([])).toThrow('at least one');
	});

	test('selects presets from the client network and rejects mismatches', () => {
		const mainnet = misoLink({ parentDomain }).register({ network: 'mainnet', core: {} } as never);
		const tx = new Transaction();
		mainnet.tx.register(input)(tx);
		const command = tx.getData().commands[0];
		expect(command?.$kind === 'MoveCall' && command.MoveCall.package).toBe(MAINNET_LINK_CONFIG.tempSubdomainsProxyPackageId);
		expect(() => misoLink({ parentDomain, network: 'testnet' }).register({ network: 'mainnet', core: {} } as never)).toThrow('does not match');
	});
});

test('resolve treats a missing leaf as an ordinary null outcome', async () => {
	const link = misoLink({ parentDomain }).register({ network: 'testnet', core: { resolveNameServiceAddress: async () => ({ address: null }) } } as never);
	expect(await link.resolve('isrc', 'US-NAG-24-98535')).toBeNull();
});

test('resolve uses the standard-specific name and returns the documented shape', async () => {
	let resolvedName: string | undefined;
	const link = misoLink({ parentDomain }).register({
		network: 'testnet',
		core: { resolveNameServiceAddress: async ({ name }: { name: string }) => { resolvedName = name; return { address: '0x456' }; } },
	} as never);
	expect(await link.resolve('upc', '0602448048998')).toEqual({
		address: '0x456',
		standard: 'upc',
		code: '0602448048998',
		name: '0602448048998.upc.link.example.sui',
	});
	expect(resolvedName).toBe('0602448048998.upc.link.example.sui');
});

test('executing methods reject chain failures with detail and wait after success', async () => {
	let waitedWith: unknown;
	const client = {
		network: 'testnet',
		core: {
			waitForTransaction: async (input: unknown) => { waitedWith = input; },
			resolveNameServiceAddress: async () => ({ address: null }),
		},
	} as never;
	const link = misoLink({ parentDomain }).register(client);
	const input = { parent, standard: 'isrc' as const, code: 'US-NAG-24-98535', target: '0x456' };
	const success = { $kind: 'Transaction', Transaction: { digest: 'ok', status: { success: true } } };
	await link.register(input, { signer: { signAndExecuteTransaction: async () => success } as never });
	expect(waitedWith).toEqual({ result: success });

	const failure = { $kind: 'FailedTransaction', FailedTransaction: { digest: 'bad', status: { success: false, error: { message: 'MoveAbort(42)' } } } };
	expect(link.register(input, { signer: { signAndExecuteTransaction: async () => failure } as never })).rejects.toThrow('MoveAbort(42)');
});
