import { Ref, ref } from '@vue/composition-api';
import { LocalStorage } from 'quasar';
import * as utils from './utils.js';
import { createHash } from 'crypto';
import * as base64url from './base64url-arraybuffer.js';

interface Session {
  email: string;
  kid: string;
  expire: number;
}

type UP_ACT = 'UP-READY' | 'UP-LOGIN' | 'UP-SIGN' | 'UP-CLOSE';

export interface UnipassAccount {
  address: string;
  email: string;
}
export interface UnipassMessage {
  upact: UP_ACT;
  payload?: string | UnipassAccount;
}

const account: Ref<UniAccount | undefined> = ref();

export const useAccount = (): Ref<UniAccount | undefined> => {
  return account;
};

const URL_BASE = 'http://192.168.2.150:3000';

let sendWebAuthnResponse = (body: unknown) => {
  return fetch(`${URL_BASE}/response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + localStorage.getItem('token')
    },
    body: JSON.stringify(body)
  })
    .then(response => response.json())
    .then(response => {
      if (response.status !== 'ok')
        throw new Error(
          `Server responed with error. The message is: ${response.message}`
        );

      return response;
    });
};

let getMakeCredentialsChallenge = (email: string) => {
  return fetch(`${URL_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: email, name: email })
  })
    .then(response => response.json())
    .then(response => {
      if (response.status !== 'ok')
        throw new Error(
          `Server responed with error. The message is: ${response.message}`
        );

      return response;
    });
};

let getGetAssertionChallenge = (email: string) => {
  return fetch(`${URL_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({username: email}),
  })
    .then((response) => response.json())
    .then((response) => {
      if (response.status !== 'ok')
        throw new Error(
          `Server responed with error. The message is: ${response.message}`,
        );
      localStorage.setItem('token', response.token);
      return response;
    });
};


export class UniAccount {
  private kid: string;
  private pubKey: string;

  constructor(private _email: string) {
    // this.kid = getKID(this.fp);

    // for test purpose
    this.kid = 'AQdXjN0Z8R8A37K7RDADh3FoA_B100p_G2aXMtUzr0vhiU5PFYzBWZAZVcFibhmnkrb_vS30CD6gc4FrDZx348O5L4qM46Y1wPArCUBpqaNxX7Oc8wXQUmON';
    this.pubKey = '0x80a1fb2a499522d0961ab7632cf97a6a010cac6b10ad665edeb06372111b55ee47ad4cdb4a7f30ec07ca794bc934a226332c5d4942c6c4fc791608e7b5f7aa9b';
  }

  async register() {
    // register with email and kid

      // fetch challenge from server
      let response = await getMakeCredentialsChallenge(this.email);
      let cred = utils.preformatMakeCredReq(response.challenge);
      localStorage.setItem('token', response.token);

      // create credentials
      response = await navigator.credentials.create({ publicKey: cred });
      let makeCredResponse = utils.publicKeyCredentialToJSON(response!);
      console.log('register signed result', makeCredResponse);

      // send credential to server for verification
      response = await sendWebAuthnResponse(makeCredResponse);
      if (response.status === 'ok') {
        this.kid = response.authenticator.credID;
        this.pubKey = utils.convertPubkeyToHex(response.authenticator.publicKey);
      } else {
        throw new Error(
          `Server responed with error. The message is: ${response.message}`
        );
      }

    // login for user & store session in localstorage
    // const isLogin = await login();
    // if (isLogin) return new UniAccount(email);
  }

  get fp() {
    return 'use fingerprintjs to get a fp';
  }

  get pubkey() {
    return getPubkey(this.kid);
  }

  get email() {
    return this._email;
  }

  get ckbAddress() {
    return `get ckb address from pubkey`;
  }

  isLogin(): boolean {
    // check localstorage for session info
    const session = LocalStorage.getItem(this.fp) as Session;
    if (!!session) {
      if (session.expire > new Date().getTime()) {
        return true;
      } else {
        console.log('session expired');
        this.logout();
      }
    }

    return false;
  }

  async login() {
    // if (this.isLogin()) return;

    // get challenge from server
    let response = await getGetAssertionChallenge(this.email);
    let publicKey = utils.preformatGetAssertReq(response.challenge);

    // get assertion from authenticator
    response = await navigator.credentials.get({ publicKey });
    console.log('login response', response);
    let getAssertionResponse = utils.publicKeyCredentialToJSON(response);

    // send assertion to server for verfication
    response = await sendWebAuthnResponse(getAssertionResponse);
    if (response.status === 'ok') {
      this.kid = response.authenticator.credID;
      this.pubKey = utils.convertPubkeyToHex(response.authenticator.publicKey);

      console.log('this.pubKey', this.pubKey);
    } else {
      throw new Error(
      `Server responed with error. The message is: ${response.message}`
      );
    }
    // use fp
  }

  logout() {
    return;
  }

  async sign(message: Buffer): Promise<string> {

      const challenge = message;
      console.log('challenge', challenge);
      const credIDBuffer = base64url.decode(this.kid);
    
      let webauthnPubKey: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: credIDBuffer,
            transports: ['usb', 'nfc', 'ble', 'internal'],
            type: 'public-key',
          },
        ],
      }
    
      const webauthnResult = await navigator.credentials.get({ publicKey: webauthnPubKey })
      console.log('webauthResult', webauthnResult)
      const { signature, clientDataJSON, authenticatorData } = webauthnResult.response
      // console.log('signature', arrayBufferToHex(signature))
      // console.log('clientDataJSON', arrayBufferToHex(clientDataJSON))

      // const utf8Decoder = new TextDecoder('utf-8')
      // const decodedClientData = utf8Decoder.decode(clientDataJSON)
      // const clientDataObj = JSON.parse(decodedClientData)
      // console.log('clientDataObj', clientDataObj)
    
      let authrDataStruct = utils.parseGetAssertAuthData(authenticatorData)
      console.log('authrDataStruct', authrDataStruct)

    
      const { r, s } = utils.extractRSFromSignature(signature.toBuffer())
      const rsSignature = Buffer.concat([r, s])
    
      const authrData = Buffer.concat([
        authrDataStruct.rpIdHash.toBuffer(),
        authrDataStruct.flagsBuf.toBuffer(),
        authrDataStruct.counterBuf.toBuffer(),
      ])

      console.log('signature', rsSignature.toString('hex'))
      console.log('authrData', authrData.toString('hex'))

      const pubKeyBuffer = Buffer.from(this.pubKey.replace('0x', ''), 'hex');
    
      const lockBuffer = Buffer.concat([pubKeyBuffer, rsSignature, authrData, clientDataJSON.toBuffer()])
    
      let lockSig = lockBuffer.toString('hex')
      while(lockSig.length < 1128) lockSig += '0';
      console.log('emptyWitness.lock', lockSig)
    
      return lockSig;
  }

  authorize(pubkey: string) {
    return pubkey;
  }
}

function getKID(fp: string): string {
  return `get kid from fp`;
}

function getPubkey(kid: string): string {
  return `get pubkey from kid`;
}

const login = async (): Promise<boolean> => {
  return new Promise(() => {
    return true;
  });
};
