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
import CosmosDelegateTool from 'cosmos-delegation-js'
import { Session } from 'meteor/session'

Meteor.methods({
    'delegation.getAccountInfo': function(delegateTool, address) {
        let dt = new CosmosDelegateTool();
        dt.setNodeURL(LCD);
        return dt.getAccountInfo(address);
    },
    'delegation.connect': function() {
        this.unblock();
        let delegateTool = Session.get('delegateTool')
        delegateTool.connect();
    },
    'transaction.submit': function(txInfo) {
        const url = `${LCD}/txs`;
        data = {
            "tx": txInfo.value,
            "mode": "sync"
        }
        console.log(JSON.stringify(data))
        let response = HTTP.post(url, {data});
        if (response.statusCode == 200) {
            return true;
        }
    },
    'delegation.send': function(txInfo) {
        const url = `${LCD}/txs`;
        data = {
            "tx": {
                "msg": txInfo.msgs,
                "fee": txInfo.fee,
                "memo": txInfo.memo,
                "signatures": txInfo.msgs[0].signatures
            },

                    /*"msg": [{
                        "type": "cosmos-sdk/MsgDelegate",
                        "value": {
                            "delegator_address": txInfo.delegatorAddress,
                            "validator_address": txInfo.validatorAddress,
                            "amount": {
                                "denom": txInfo.denom,
                                "amount": txInfo.amount}}}],
                    "fee": {
                      "gas": txInfo.gas
                    },
                    "signatures": [
                      {
                        "pub_key": {
                          "type": "tendermint/PubKeySecp256k1",
                          "value": txInfo.pubKey
                        },
                        "account_number": txInfo.accountNumber,
                        "sequence": txInfo.sequence,
                        "signature": txInfo.signature
                      }
                    ],
                    "memo": "Sent via Big Dipper"
                }},*/
            "mode": "block"
        };
        console.log(JSON.stringify(data))
        let response = HTTP.post(url, {data});
        if (response.statusCode == 200) {
            return true;
        }
    },
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