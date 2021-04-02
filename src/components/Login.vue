<template>
  <div class="column">
    <h5 class="text-center" v-if="mode==='login'"> Welcome to Unipass 
      <p class="text-caption text-grey-8"> Your <b>universal passport</b> in web 3.0 </p>
    </h5>
    <h5 class="text-center" v-else> Create Unipass Account
      <p class="text-caption text-grey-8"> <b>simple</b> as usual, <b>secure</b> as never </p>
    </h5>
    <div class="row items-center">
    <q-input class="col" v-model="mailname" type="email" placeholder="Email"
      dense 
      filled
      bottom-slots
      square>
      <template v-slot:hint>
        <span v-if="mode==='reg'">Use new email for privacy <q-btn dense round flat size="xs" icon="help_outline" /></span>
      </template>
      <template v-slot:prepend>
        <q-icon name="mail" size="xs" />
      </template>
    </q-input>
      <q-select
        dense
        filled
        bottom-slots
        transition-show="jump-up"
        transition-hide="jump-up"
        square
        v-model="sp"
        :display-value="`<span class='text-caption'><span class='text-grey-6'>@</span> ${sp}</span>`"
        :options="sps"
      />
    </div>
    <div class="row q-mt-lg">
      <q-btn v-if="mode==='login'" :loading="loading" class="full-width" color="primary" no-caps @click="login"> Login </q-btn>
      <q-btn v-else class="full-width" :loading="loading" color="primary" no-caps @click="register"> Sign up </q-btn>
    </div>
    <div class="q-mt-sm text-center">
      <span v-if="mode === 'login'" class="text-grey-8"> Haven't got an account? <a href="#" @click="mode = 'reg'"> Sign up </a></span>
      <span v-else class="text-grey-8"> Already got an account? <a href="#" @click="mode = 'login'"> Login </a></span>
    </div>
  <q-dialog v-model="showOTP" persistent>
   <q-card>
      <q-toolbar>
        <q-toolbar-title class="text-center"> Email Verification </q-toolbar-title>
      </q-toolbar>
      <q-card-section class="column justify-between items-center">
        Please input the verification code sent to <p class="text-bold">{{ email }}</p>
        <verification-input :field-width="36" :field-height="36" type="number" @complete="otpComplete" :loading="false"/>
        <div class="q-mt-md">
          <span v-if="resendAfter" class="text-caption text-grey"> Resend code in <span class="text-primary">{{ resendAfter }}s</span></span>
          <q-btn v-else dense size="sm" flat color="primary" no-caps label="Resend Code" @click="otpSend" />
        </div>
      </q-card-section>
      <q-card-actions align="evenly">
        <q-btn flat label="Cancel" color="grey" v-close-popup />
        <q-separator inset vertical />
        <q-btn flat label="Confirm" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog> 
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { login, logout, register, UnipassAccount, UnipassMessage, useAccount } from 'src/compositions/account';
import VerificationInput from 'vue-verification-code-input';
export default defineComponent({
  name: 'Login',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  components: { VerificationInput },
  setup () {
    const mode = ref('login');
    const sps = ['gmail.com', 'qq.com', 'hotmail.com', '163.com', '126.com'];
    const sp = ref(sps[0]);
    const mailname = ref('');
    const email = computed(() => `${mailname.value}@${sp.value}`);
    const resendCounter = ref();
    const resendAfter = ref(0);
    const opener = ref('');
    const account = useAccount();
    const loading = ref(false);
    return {
      loading,
      account,
      mode,
      sps,
      sp,
      mailname,
      email,
      resendCounter,
      resendAfter,
      showOTP: ref(false),
      opener
    }
  },
  methods: {
    otpSend: function () {
      console.log('[otp send]', this.resendAfter);
      if(this.resendAfter > 0) { return; }

      // TODO: Request to send OTP

      this.resendCounter && clearInterval(this.resendCounter);
      this.resendAfter = 60;
      this.resendCounter = setInterval(() => {
        this.resendAfter --
        if(this.resendAfter === 0) {
          clearInterval(this.resendCounter);
          return;
        }
      }, 1000);
    },
    otpComplete: function(val: number) {
      console.log(`[otp complete]: ${val}`);
    },
    register: async function() {
      // TODO: checks

      // this.showOTP = true;
      // this.otpSend();
      this.loading = true;
      try {
        this.account = await register(this.email);
        await this.login();
      } catch(e) {
        this.$q.notify({
          type: 'warning',
          position: 'top',
          message: (e as Error).message
        })
      }
      this.loading = false;
    },

    login: async function() {
      this.loading = true;
      try {
        this.account = await login(this.email);
      } catch (e) {
        this.$q.notify({
          type: 'warning',
          position: 'top',
          message: (e as Error).message
        })
      }
      this.loading = false;

      let info: UnipassAccount | undefined = undefined;

      if(this.account && this.account.pubkey) {
        info = { pubkey: this.account.pubkey, email: this.account.email };
      }

      const msg: UnipassMessage = {
        upact: 'UP-LOGIN',
        payload: info
      };
      console.log('[Login.vue] msg', msg);
      window.opener && (window.opener as Window).postMessage(msg, this.opener);
    },
    logout: function() {
      logout();
    },
    messageListener(event: MessageEvent) {
      if((event.data as UnipassMessage).upact === 'UP-LOGIN'){
        this.opener = event.origin;
        console.log('[opener]', this.opener);
      }
    }
  },
  mounted() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    window.addEventListener('message', this.messageListener, false);
    window.opener && (window.opener as Window).postMessage({upact: 'UP-READY'}, '*');
  },
  destroyed() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.messageListener && window.removeEventListener('message', this.messageListener);
  }
})
</script>
<style lang="scss">
.q-field__after, .q-field--dense .q-field__after {
  padding-left: 0;
}
</style>
