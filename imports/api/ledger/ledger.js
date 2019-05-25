//import 'babel-polyfill';
//import Cosmos from "@lunie/cosmos-js"
import { Promise } from "meteor/promise";
import { HTTP } from 'meteor/http';
import { App, comm_node } from "ledger-cosmos-js"
import { signatureImport } from "secp256k1"
import semver from "semver"
import bip39 from "bip39";
import bip32 from "bip32";
import bech32 from "bech32";
import secp256k1 from "secp256k1";
import sha256 from "crypto-js/sha256"
import ripemd160 from "crypto-js/ripemd160"
import CryptoJS from "crypto-js"


Meteor.methods({
    'delegation.simulate': function(delegator_address, validator_address, amount) {
        const url = `${LCD}/staking/delegators/${delegator_address}/delegations`;
        data = {
            "base_req": {
                "from": delegator_address,
                "memo": "Sent via BD",
                "chain_id": Meteor.settings.public.chainId,
                "gas_adjustment": "1.2",
                "simulate": true
            },
            "delegator_address": delegator_address,
            "validator_address": validator_address,
            "amount": {
                "denom": Meteor.settings.public.stakingDenom,
                "amount": amount
            }
        };
        let response = HTTP.post(url, {data});
        if (response.statusCode == 200) {
            return JSON.parse(response.content).gas_estimate;
        }
    },
})