import { Ref, ref } from '@vue/composition-api';
import { LocalStorage } from 'quasar';

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

export class UniAccount {
  private kid: string;

  constructor(private _email: string) {
    this.kid = getKID(this.fp);
  }

  static async register(email: string): Promise<UniAccount | undefined> {
    // register with email and kid

    // login for user & store session in localstorage
    const isLogin = await login();
    if (isLogin) return new UniAccount(email);
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

  login() {
    if (this.isLogin()) return;

    // use fp
  }

  logout() {
    return;
  }

  sign(message: Buffer): string {
    return `${message.toString()}`;
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
