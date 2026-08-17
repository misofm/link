# Miso Link

```ts
const recording = await client.link.resolve('isrc', 'US-NAG-24-98535');
// → { address, standard: 'isrc', code: 'usnag2498535', name: 'usnag2498535.isrc.link.miso.sui' }
await client.link.register({ parent, standard: 'isrc', code: 'US-NAG-24-98535', target: recordingId }, { signer });
await client.link.reassign({ parent, standard: 'isrc', code, target: newId }, { signer });
await client.link.unregister({ parent, standard: 'isrc', code }, { signer });
```

Miso Link maps a music identifier to a payable Sui object through a SuiNS leaf subname. A resolution is an assertion by the controller of the configured parent domain, **not** a registration with IFPI, CISAC, GS1, or any other standards body.

```ts
const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })
	.$extend(misoLink({ parentDomain: 'link.example.sui', config: TESTNET_LINK_CONFIG }));
```

`parentDomain` is the namespace below the per-standard node. For example, an `isrc` write under `link.example.sui` receives the caller-owned `SuinsRegistration` for `isrc.link.example.sui` as `parent`. Neither that domain nor `link.miso.sui` is a package constant.

`tx.register`, `tx.reassign`, and `tx.bulkRegister` are thunks for composition in a caller-owned PTB. Bulk builders support catalogs larger than 50 entries, subject to the network's PTB limits. Reassignment emits `remove_leaf` then `new_leaf` in the same PTB, so it is atomic. Executing methods check the on-chain status and wait for the transaction before returning, making an immediate `resolve` safe on the same client.

Pass `{ validation: { strict: true } }` to `misoLink` to enforce the ISWC, GTIN, and ISNI check digits. The default validates their published shapes without rejecting legacy-but-real identifiers solely for a bad check digit.

## Decisions

- Names use lowercase, separator-free identifiers. Leaf metadata is not stored: normalized code is sufficient to construct and display the canonical bridge name, while original punctuation remains an application concern.
- The installed SuiNS validator accepts one-character leaf labels; the standards here have longer normalized forms, so none collide with a minimum label rule.
- `@mysten/suins@1.2.14` still routes nested-parent leaf writes through the configurable `tempSubdomainsProxyPackageId`. The network presets come from that package, and callers can override every deployment ID; verify the proxy before production deployment.
- Leaves inherit their parent's expiry. Operators must renew the parent registration before it lapses.
- `resolve` is a fast forward name lookup and does not fetch/type-check the returned object. Callers moving money should verify their business object separately when their threat model requires it.

## Future work

No Move package is included. A later wrapper may add typed `NameAssignedEvent`s and prove a leaf target matches its implied Miso object type; it would still compose SuiNS `new_leaf` rather than replace it.

## References

- [Mysten SDK-building guidance](https://sdk.mystenlabs.com/sui/sdk-building)
- [SuiNS developer SDK](https://docs.sui.io/sui-stack/suins/developer/sdk)
- [SuiNS contracts](https://github.com/MystenLabs/suins-contracts)
- [IFPI ISRC Handbook](https://isrc.ifpi.org/en/)
- [CISAC ISWC](https://www.iswc.org/)
- [GS1 GTIN validation](https://www.gs1.org/services/how-calculate-check-digit-manually)
- [ISO 27729 / ISNI](https://isni.org/page/isni-standard/)
