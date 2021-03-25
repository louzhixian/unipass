import { Ref, ref } from '@vue/composition-api';
import { LocalStorage } from 'quasar';
import * as utils from './utils.js';
import * as base64url from './base64url-arraybuffer.js';
// import FP from '@fingerprintjs/fingerprintjs';

interface Session {
  account: UniAccount;
  expire: number;
}

export type UP_ACT = 'UP-READY' | 'UP-LOGIN' | 'UP-SIGN' | 'UP-CLOSE';

export interface UnipassAccount {
  address: string;
  email: string;
}

export interface UnipassMessage {
  upact: UP_ACT;
  payload?: string | UnipassAccount;
}

interface AuthrInfo {
  fmt: string;
  publicKey: string;
  counter: string;
  credID: string;
}

interface SuccessResponse {
  status: string;
  token: string;
  challenge: unknown;
  authenticator: AuthrInfo;
}

interface FailResponse {
  status: string;
  message: string;
}

const account: Ref<UniAccount | undefined> = ref();

export const useAccount = (): Ref<UniAccount | undefined> => {
  return account;
};

const URL_BASE = 'https://testapi.unipass.me';

export class UniAccount {
  private _kid: string | undefined;
  private _pubkey: string | undefined;
  constructor(private _email: string) {}

  get email() {
    return this._email;
  }

  get kid() {
    return this._kid;
  }

  get pubkey() {
    return this._pubkey;
  }

  async register() {
    // fetch challenge from server
    let response = await getMakeCredentialsChallenge(this._email);
    const cred = utils.preformatMakeCredReq(
      response.challenge
    ) as PublicKeyCredentialCreationOptions;
    localStorage.setItem('token', response.token);

    // create credentials
    const response1 = await navigator.credentials.create({ publicKey: cred });
    const makeCredResponse = utils.publicKeyCredentialToJSON(
      response1
    ) as unknown;
    console.log('register signed result', makeCredResponse);

    // send credential to server for verification
    response = await sendWebAuthnResponse(makeCredResponse);

    this._kid = response.authenticator.credID;
    this._pubkey = utils.convertPubkeyToHex(response.authenticator.publicKey);

    this.saveSession();

    return this;
  }

  // login for user & store session in localstorage
  get ckbAddress() {
    return 'get ckb address from pubkey';
  }

  isLogin(): boolean {
    // check localstorage for session info
    const session = LocalStorage.getItem(this.email) as Session;
    console.log('[isLogin]', session);
    if (!!session) {
      if (!session.expire || session.expire > new Date().getTime()) {
        return true;
      } else {
        console.log('session expired');
        this.logout();
      }
    }

    return false;
  }

  async login() {
    console.log('[login]');
    if (this.isLogin()) return;

    // get challenge from server
    let response = await getGetAssertionChallenge(this.email);
    const publicKey = utils.preformatGetAssertReq(
      response.challenge
    ) as PublicKeyCredentialRequestOptions;

    // get assertion from authenticator
    const response2 = await navigator.credentials.get({ publicKey });
    console.log('login response', response2);
    const getAssertionResponse = utils.publicKeyCredentialToJSON(
      response2
    ) as unknown;

    // send assertion to server for verfication
    response = await sendWebAuthnResponse(getAssertionResponse);
    this._kid = response.authenticator.credID;
    this._pubkey = utils.convertPubkeyToHex(response.authenticator.publicKey);
    console.log('this.pubKey', this.pubkey);

    this.saveSession();

    return this;
  }

  saveSession() {
    const session: Session = {
      account: this,
      expire: 0
    };
    console.log('[Saving Sesion]', session);
    LocalStorage.set(this.email, session);
  }

  logout() {
    LocalStorage.remove(this.email);
    return;
  }

  async sign(message: Buffer): Promise<string> {
    if (!this.kid || !this.pubkey) {
      throw new Error('Need login');
    }
    const challenge = message;
    console.log('challenge', challenge);
    const credIDBuffer = base64url.decode(this.kid);

    const webauthnPubKey: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: credIDBuffer,
          transports: ['usb', 'nfc', 'ble', 'internal'],
          type: 'public-key'
        }
      ]
    };

    const webauthnResult = (await navigator.credentials.get({
      publicKey: webauthnPubKey
    })) as PublicKeyCredential;
    console.log('webauthResult', webauthnResult);
    const {
      signature,
      clientDataJSON,
      authenticatorData
    } = webauthnResult.response as AuthenticatorAssertionResponse;
    // console.log('signature', arrayBufferToHex(signature))
    // console.log('clientDataJSON', arrayBufferToHex(clientDataJSON))

    // const utf8Decoder = new TextDecoder('utf-8')
    // const decodedClientData = utf8Decoder.decode(clientDataJSON)
    // const clientDataObj = JSON.parse(decodedClientData)
    // console.log('clientDataObj', clientDataObj)

    const authrDataStruct = utils.parseGetAssertAuthData(
      authenticatorData
    ) as Record<string, ArrayBuffer>;
    console.log('authrDataStruct', authrDataStruct);

    const { r, s } = utils.extractRSFromSignature(utils.toBuffer(signature));
    const rsSignature = Buffer.concat([r, s]);

    const authrData = Buffer.concat([
      utils.toBuffer(authrDataStruct.rpIdHash),
      utils.toBuffer(authrDataStruct.flagsBuf),
      utils.toBuffer(authrDataStruct.counterBuf)
    ]);

    console.log('signature', rsSignature.toString('hex'));
    console.log('authrData', authrData.toString('hex'));

    const pubKeyBuffer = Buffer.from(this.pubkey.replace('0x', ''), 'hex');

    const lockBuffer = Buffer.concat([
      pubKeyBuffer,
      rsSignature,
      authrData,
      utils.toBuffer(clientDataJSON)
    ]);

    let lockSig = lockBuffer.toString('hex');
    while (lockSig.length < 1128) lockSig += '0';
    console.log('emptyWitness.lock', lockSig);

    return lockSig;
  }
}

/*
async function getFP() {
  const fp = (await (await FP.load()).get()).visitorId;
  console.log('[FP Get]', fp);
  return fp;
}
*/

const getMakeCredentialsChallenge = async (email: string) => {
  const response = await fetch(`${URL_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: email, name: email })
  });
  const response_1 = (await response.json()) as SuccessResponse | FailResponse;
  if (response_1.status !== 'ok')
    throw new Error(
      `Server responed with error. The message is: ${
        (response_1 as FailResponse).message
      }`
    );
  return response_1 as SuccessResponse;
};

const getGetAssertionChallenge = async (email: string) => {
  const response = await fetch(`${URL_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: email })
  });
  const response_1 = (await response.json()) as SuccessResponse | FailResponse;
  if (response_1.status !== 'ok')
    throw new Error(
      `Server responed with error. The message is: ${
        (response_1 as FailResponse).message
      }`
    );
  localStorage.setItem('token', (response_1 as SuccessResponse).token);
  return response_1 as SuccessResponse;
};

const sendWebAuthnResponse = async (body: unknown) => {
  const response = await fetch(`${URL_BASE}/response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    },
    body: JSON.stringify(body)
  });
  const response_1 = (await response.json()) as SuccessResponse | FailResponse;
  if (response_1.status !== 'ok')
    throw new Error(
      `Server responed with error. The message is: ${
        (response_1 as FailResponse).message
      }`
    );
  return response_1 as SuccessResponse;
};
