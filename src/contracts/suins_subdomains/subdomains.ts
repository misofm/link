/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface NewLeafOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function newLeaf(options: NewLeafOptions) {
    const packageAddress = options.package ?? '0x3c272bc45f9157b7818ece4f7411bdfa8af46303b071aca4e18c03119c9ff636';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock',
        '0x1::string::String',
        'address'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'subdomains',
        function: 'new_leaf',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface RemoveLeafOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function removeLeaf(options: RemoveLeafOptions) {
    const packageAddress = options.package ?? '0x3c272bc45f9157b7818ece4f7411bdfa8af46303b071aca4e18c03119c9ff636';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock',
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'subdomains',
        function: 'remove_leaf',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}