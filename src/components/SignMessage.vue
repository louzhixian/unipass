<template>
  <div class="column">
    <q-card flat bordered class="q-pa-md">
      <p class="text-subtitle2 text-grey text-center">Message to sign:</p>
      <q-card-section class="bg-blue-grey-1">
        <div class="text-subtitle">{{ message }}</div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
export default defineComponent({
  name: 'SignMessage',
  props: {
    message: {
      required: true,
      type: String
    }
  },
  setup () {
    const signature = ref('');
    return {
      signature
    }
  }
})
</script>
