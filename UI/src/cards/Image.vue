<template>
<img :src="src" alt="">
</template>

<script>
export default {
  name: 'simpleImage',
  props: ['options', 'payload'],
  created() {
    console.log(this.payload);
  },
  didRender() {
console.log('didRender')
  },
  data () {
    return {
      contentEditable: true,
      editorVm: this.options.getEditorVm()
    }
  },
  computed: {
    canEdit () {
      return true
    },
    src() {
      return this.payload.src ? this.payload.src : '';
    }
  }
}
</script>