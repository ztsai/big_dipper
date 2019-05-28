import 'babel-polyfill';
import Cosmos from "@lunie/cosmos-js"
import { App, comm_u2f } from "ledger-cosmos-js"
import { signatureImport } from "secp256k1"
import semver from "semver"
import bip39 from "bip39";
import bip32 from "bip32";
import bech32 from "bech32";
import secp256k1 from "secp256k1";
import sha256 from "crypto-js/sha256"
import ripemd160 from "crypto-js/ripemd160"
import CryptoJS from "crypto-js"
import _ from 'lodash';
import CosmosDelegateTool from 'cosmos-delegation-js'

// TODO: discuss TIMEOUT value
const INTERACTION_TIMEOUT = 120000 // seconds to wait for user action on Ledger, currently is always limited to 60
const REQUIRED_COSMOS_APP_VERSION = "1.5.0"

/*
HD wallet derivation path (BIP44)
DerivationPath{44, 118, account, 0, index}
*/

const HDPATH = [44, 118, 0, 0, 0]
const BECH32PREFIX = `cosmos`

function createDelegationMessage(message) {
    let subMessage = `{"type":"auth/StdTx","value":{`+
        `"fee":{"gas":"${message.gas}"},`+
        `"memo":"Sent via Big Dipper",`+
        `"msg":[{`+
            `"type":"cosmos-sdk/MsgDelegate",`+
            `"value":{`+
                `"amount":{"amount":"${message.amount}","denom":"${message.denom}"},`+
                `"delegator_address":"${message.delegatorAddress}",`+
                `"validator_address":"${message.validatorAddress}"}}],`+
        `"signatures":[{`+
                `"account_number":${message.accountNumber},`+
                `"pub_key":{`+
                    `"type":"tendermint/PubKeySecp256k1",`+
                    `"value":"${message.pubKey}"`+
                `},`+
                `"sequence":${message.sequence},`+
                `"signature":null`+
            `}]`+
        `}}`;
/*    let subMessage = `{"type":"cosmos-sdk/MsgDelegate","value":{` +
            `"amount":{"amount":${message.amount},"denom":"${message.denom}"},` +
            `"delegator_address":"${message.delegator_address}",` +
            `"validator_address":"${message.validator_address}"}}`;*/
    return `{"account_number":"${message.accountNumber}",`+
            `"chain_id":"${Meteor.settings.public.chainId}",`+
            `"fee":{"gas":"${message.gas}"},`+
            `"memo":"Sent via Big Dipper",`+
            `"msgs":[${subMessage}],`+
            `"sequence":${message.sequence}}`;
}

function bech32ify(address, prefix) {
    const words = bech32.toWords(address)
    return bech32.encode(prefix, words)
}

export const toPubKey = (address) => {
    return bech32.decode('cosmos', address);
}

function createCosmosAddress(publicKey) {
    const message = CryptoJS.enc.Hex.parse(publicKey.toString(`hex`))
    const hash = ripemd160(sha256(message)).toString()
    const address = Buffer.from(hash, `hex`)
    const cosmosAddress = bech32ify(address, `cosmos`)
    return cosmosAddress
}

export class Ledger {
    constructor({ testModeAllowed }) {
        this.testModeAllowed = testModeAllowed
    }
    async signDelegationMessage(message) {
        let txMsg = createDelegationMessage(message)
        console.log(txMsg);
        let signature = await this.sign(txMsg);
        let data = JSON.parse(txMsg);
        data.msgs[0].value.signatures[0].signature = Buffer.from(signature).toString('base64')
        console.log(JSON.stringify(data));
        return data
    }

    // test connection and compatibility
    async testDevice() {
        // poll device with low timeout to check if the device is connected
        const secondsTimeout = 3 // a lower value always timeouts
        await this.connect(secondsTimeout)
    }
    async isSendingData() {
        // check if the device is connected or on screensaver mode
        const response = await this.cosmosApp.publicKey(HDPATH)
        this.checkLedgerErrors(response, {
        timeoutMessag: "Could not find a connected and unlocked Ledger device"
        })
    }
    async isReady() {
    // check if the version is supported
        const version = await this.getCosmosAppVersion()

        if (!semver.gte(version, REQUIRED_COSMOS_APP_VERSION)) {
        const msg = `Outdated version: Please update Ledger Cosmos App to the latest version.`
        throw new Error(msg)
        }

        // throws if not open
        await this.isCosmosAppOpen()
    }
    // connects to the device and checks for compatibility
    async connect(timeout = INTERACTION_TIMEOUT) {
        // assume well connection if connected once
        if (this.cosmosApp) return

        const communicationMethod = await comm_u2f.create_async(timeout, true)
        const cosmosLedgerApp = new App(communicationMethod)

        this.cosmosApp = cosmosLedgerApp

        await this.isSendingData()
        await this.isReady()
    }
    async getCosmosAppVersion() {
        await this.connect()

        const response = await this.cosmosApp.get_version()
        this.checkLedgerErrors(response)
        const { major, minor, patch, test_mode } = response
        checkAppMode(this.testModeAllowed, test_mode)
        const version = versionString({ major, minor, patch })

        return version
    }
    async isCosmosAppOpen() {
        await this.connect()

        const response = await this.cosmosApp.appInfo()
        this.checkLedgerErrors(response)
        const { appName } = response

        if (appName.toLowerCase() !== `cosmos`) {
            throw new Error(`Close ${appName} and open the Cosmos app`)
        }
      }
    async getPubKey() {
        await this.connect()

        const response = await this.cosmosApp.publicKey(HDPATH)
        this.checkLedgerErrors(response)
        return response.compressed_pk
      }
    async getCosmosAddress() {
        await this.connect()

        const pubKey = await this.getPubKey(this.cosmosApp)
        return {pubKey, address:createCosmosAddress(pubKey)}
      }
    async confirmLedgerAddress() {
        await this.connect()
        const cosmosAppVersion = await this.getCosmosAppVersion()

        if (semver.lt(cosmosAppVersion, REQUIRED_COSMOS_APP_VERSION)) {
            // we can't check the address on an old cosmos app
            return
        }

        const response = await this.cosmosApp.getAddressAndPubKey(
            BECH32PREFIX,
            HDPATH
        )
        this.checkLedgerErrors(response, {
            rejectionMessage: "Displayed address was rejected"
        })
      }
    async sign(signMessage) {
    await this.connect()

    const response = await this.cosmosApp.sign(HDPATH, signMessage)
    this.checkLedgerErrors(response)
    // we have to parse the signature from Ledger as it's in DER format
    const parsedSignature = signatureImport(response.signature)
    return parsedSignature
  }

  /* istanbul ignore next: maps a bunch of errors */
  checkLedgerErrors(
    { error_message, device_locked },
    {
      timeoutMessag = "Connection timed out. Please try again.",
      rejectionMessage = "User rejected the transaction"
    } = {}
  ) {
    if (device_locked) {
      throw new Error(`Ledger's screensaver mode is on`)
    }
    switch (error_message) {
        case `U2F: Timeout`:
            throw new Error(timeoutMessag)
        case `Cosmos app does not seem to be open`:
            throw new Error(`Cosmos app is not open`)
        case `Command not allowed`:
            throw new Error(`Transaction rejected`)
        case `Transaction rejected`:
            throw new Error(rejectionMessage)
        case `Unknown error code`:
            throw new Error(`Ledger's screensaver mode is on`)
        case `Instruction not supported`:
            throw new Error(
                `Your Cosmos Ledger App is not up to date. ` +
                `Please update to version ${REQUIRED_COSMOS_APP_VERSION}.`
            )
        case `No errors`:
            // do nothing
            break
        default:
            throw new Error(error_message)
        }
    }
}

function versionString({ major, minor, patch }) {
    return `${major}.${minor}.${patch}`
}

export const checkAppMode = (testModeAllowed, testMode) => {
    if (testMode && !testModeAllowed) {
        throw new Error(
            `DANGER: The Cosmos Ledger app is in test mode and shouldn't be used on mainnet!`
        )
    }
}
