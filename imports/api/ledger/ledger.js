import { HTTP } from 'meteor/http';

Meteor.methods({
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