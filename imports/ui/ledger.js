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
import TransportWebAuthn from "@ledgerhq/hw-transport-webauthn";
import TransportU2F from "@ledgerhq/hw-transport-u2f";

import regeneratorRuntime from 'regenerator-runtime/runtime';
window.regeneratorRuntime = regeneratorRuntime;

// TODO: discuss TIMEOUT value
const INTERACTION_TIMEOUT = 12000000 // seconds to wait for user action on Ledger, currently is always limited to 60
const REQUIRED_COSMOS_APP_VERSION = "1.5.0"
//const REQUIRED_LEDGER_FIRMWARE = "1.1.1"

/*
HD wallet derivation path (BIP44)
DerivationPath{44, 118, account, 0, index}
*/

const CLA = 0x55;
const INS_GET_VERSION = 0x00;
const INS_PUBLIC_KEY_SECP256K1 = 0x01;
const INS_SIGN_SECP256K1 = 0x02;
const INS_SHOW_ADDR_SECP256K1 = 0x03;
const INS_GET_ADDR_SECP256K1 = 0x04;

function errorMessage(error_code) {
    switch (error_code) {
        case 1:
            return "U2F: Unknown";
        case 2:
            return "U2F: Bad request";
        case 3:
            return "U2F: Configuration unsupported";
        case 4:
            return "U2F: Device Ineligible";
        case 5:
            return "U2F: Timeout";
        case 14:
            return "Timeout";
        case 0x9000:
            return "No errors";
        case 0x9001:
            return "Device is busy";
        case 0x6400:
            return "Execution Error";
        case 0x6700:
            return "Wrong Length";
        case 0x6982:
            return "Empty Buffer";
        case 0x6983:
            return "Output buffer too small";
        case 0x6984:
            return "Data is invalid";
        case 0x6985:
            return "Conditions not satisfied";
        case 0x6986:
            return "Transaction rejected";
        case 0x6A80:
            return "Bad key handle";
        case 0x6B00:
            return "Invalid P1/P2";
        case 0x6D00:
            return "Instruction not supported";
        case 0x6E00:
            return "Cosmos app does not seem to be open";
        case 0x6F00:
            return "Unknown error";
        case 0x6F01:
            return "Sign/verify error";
        default:
            return "Unknown error code";
    }
}


const HDPATH = [44, 118, 0, 0, 0]
const BECH32PREFIX = `cosmos`

function bech32ify(address, prefix) {
  const words = bech32.toWords(address)
  return bech32.encode(prefix, words)
}

function createCosmosAddress(publicKey) {
  const message = CryptoJS.enc.Hex.parse(publicKey.toString(`hex`))
  const hash = ripemd160(sha256(message)).toString()
  const address = Buffer.from(hash, `hex`)
  const cosmosAddress = bech32ify(address, `cosmos`)

  return cosmosAddress
}

export class MyLedger {
  async open() {
    this.transport = await TransportU2F.open()
    this.transport.setScrambleKey('CSM');
//    this.app = new App(this.transport);
  }
  async getVersion() {
    return await this.transport.send(CLA, INS_GET_VERSION, 0x0, 0x0,).then((res) => {
            var result = {};
            let apduResponse = Buffer.from(res, 'hex');
            let error_code_data = apduResponse.slice(-2);

            result["test_mode"] = apduResponse[0] !== 0;
            result["major"] = apduResponse[1];
            result["minor"] = apduResponse[2];
            result["patch"] = apduResponse[3];
            result["device_locked"] = apduResponse[4] === 1;

            result["return_code"] = error_code_data[0] * 256 + error_code_data[1];
            result["error_message"] = errorMessage(result["return_code"]);
            return result;
    })
  }
}

export class Ledger {
  constructor({ testModeAllowed }) {
    this.testModeAllowed = testModeAllowed
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
    return createCosmosAddress(pubKey)
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