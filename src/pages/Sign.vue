<template>
  <q-page padding>
    <q-toolbar class="q-py-md">
      <q-space />
      <q-chip color="primary" text-color="white">
        <q-avatar>
          <img src="https://cdn.quasar.dev/img/boy-avatar.png">
        </q-avatar>
        <div class="ellipsis">
          {{ account && account.email }}
        </div>
      </q-chip>
    </q-toolbar>
    <div class="column text-center">
      <span class="text-grey text-subtitle2"> Signature request from </span>
      <p class="text-h6"> {{ RP }} </p>
      <div class="row flex-center"><sign-message :message="message" class="col-xs-10 col-sm-6 col-md-4" /></div>
      <div class="row flex-center q-gutter-sm">
        <q-btn color="grey-8" outline label="Reject" @click="exit" />
        <q-btn color="primary" icon="check" label="Authorize" @click="sign" />
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api'
import { isLogin, UnipassMessage, useAccount } from 'src/compositions/account'
import SignMessage from 'src/components/SignMessage.vue'


export default defineComponent({
  name: 'Sign',
  components: { SignMessage },
  setup() {
    const account = useAccount();
    return {
      account,
      RP: ref('unknown'),
      message: ref('')
    }
  },
  methods: {
    exit() {
      (window.opener as Window).postMessage({upact: 'UP-SIGN', payload: 'N/A'} as UnipassMessage, this.RP);
    },
    async sign() {
      if(this.account) {
        // const msgBuffer = createHash('SHA256').update(this.message).digest();
        const msgBuffer = Buffer.from(this.message.replace('0x', ''), 'hex');
        console.log('message', msgBuffer);
        const sig = await this.account.sign(msgBuffer);
        console.log('sig', sig);
        (window.opener as Window).postMessage({upact: 'UP-SIGN', payload: sig} as UnipassMessage, this.RP);
      } else {
        // TODO: Login Hint
      }
    },
    messageListener(event: MessageEvent) {
      if('upact' in event.data) {
        const msg = event.data as UnipassMessage;
        if(msg.upact === 'UP-SIGN') {
          this.RP = event.origin;
          this.message = msg.payload as string;
        }
      }
    }
  },
  mounted() {
    this.account = isLogin();
    if(!this.account) console.warn('[Sign] need login');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    window.addEventListener('message', this.messageListener, false);
    window.opener && (window.opener as Window).postMessage({upact: 'UP-READY'} as UnipassMessage, '*');
  },
  destroyed() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    window.removeEventListener('message', this.messageListener);
  }
})
</script>
