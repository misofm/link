import type { SuiCodegenConfig } from '@mysten/codegen';

// SuiNS is external and upgradeable. `bun run codegen` uses the testnet
// deployment to audit/regenerate this module's ABI; runtime calls deliberately
// go through the version-matched SuinsTransaction wrapper, and package IDs
// always come from LinkConfig rather than generated defaults.
const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '0x3c272bc45f9157b7818ece4f7411bdfa8af46303b071aca4e18c03119c9ff636',
			packageName: 'suins_subdomains',
			network: 'testnet',
			generate: {
				modules: {
					subdomains: {
						functions: ['new_leaf', 'remove_leaf'],
						types: false,
					},
				},
			},
		},
	],
};

export default config;
