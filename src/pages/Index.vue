<template>
  <q-page class="bg-blue-grey-1 row flex-center">
    <!-- <unipass :show="false" class="absolute-bottom-right q-ma-lg" /> -->
    <login class="col-xs-10 col-sm-6 col-md-4" />
    <!-- <sign-message :message="'Hello World'"/> -->
  </q-page>
</template>

<script lang="ts">
import Login from 'components/Login.vue'
import SignMessage from 'src/components/SignMessage.vue'
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'PageIndex',
  components: { Login, SignMessage },
  setup() {
    return {}
  },
});
</script>
