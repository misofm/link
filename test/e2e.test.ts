import { expect, test } from 'bun:test';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { misoLink } from '../src/index.js';

const enabled = process.env.MISO_LINK_E2E === '1';

test.skipIf(!enabled)('testnet leaf lifecycle: register, resolve, reassign, unregister', async () => {
	const parent = required('MISO_LINK_E2E_PARENT');
	const parentDomain = required('MISO_LINK_E2E_PARENT_DOMAIN');
	const initialTarget = required('MISO_LINK_E2E_TARGET');
	const reassignedTarget = required('MISO_LINK_E2E_REASSIGN_TARGET');
	const signer = Ed25519Keypair.fromSecretKey(required('MISO_LINK_E2E_PRIVATE_KEY'));
	const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })
		.$extend(misoLink({ parentDomain, network: 'testnet' }));
	const link = client.link!;
	const code = `USMIS26${String(Date.now() % 100_000).padStart(5, '0')}`;

	await link.register({ parent, standard: 'isrc', code, target: initialTarget }, { signer });
	expect((await link.resolve('isrc', code))?.address).toBe(initialTarget);

	await link.reassign({ parent, standard: 'isrc', code, target: reassignedTarget }, { signer });
	expect((await link.resolve('isrc', code))?.address).toBe(reassignedTarget);

	await link.unregister({ parent, standard: 'isrc', code }, { signer });
	expect(await link.resolve('isrc', code)).toBeNull();
});

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required when MISO_LINK_E2E=1`);
	return value;
}
