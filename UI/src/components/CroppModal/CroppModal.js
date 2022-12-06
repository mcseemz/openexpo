import { mapGetters } from 'vuex';
import Vue from 'vue';
import VuejsClipper from 'vuejs-clipper/dist/vuejs-clipper.umd';
import 'vuejs-clipper/dist/vuejs-clipper.css';

Vue.use(VuejsClipper);
Vue.use(VuejsClipper, {
 components: {
    clipperBasic: true,
    clipperPreview: true,
    clipperFixed: true,
 }
});

export default {
  name: 'CroppModal',
  props: {
    croppRatio: Number,
  },
  data: () => {
    return {
      urlForCropp: '',
      file: null
    }
  },
  methods: {
    open(url, file) {
      this.urlForCropp = url;
      this.file = file;
      this.$refs.croppModal.open();
    },
    save() {
      const croppResult = this.$refs.croppBox.clip();
      const url = croppResult.toDataURL();
      const blobBin = atob(url.split(',')[1]);
      const array = [];
      for (let i = 0; i < blobBin.length; i++) {
          array.push(blobBin.charCodeAt(i));
      }

      const fileName = this.file[0].file.name;
      const file = new Blob([new Uint8Array(array)], {type: 'image/png'});
      file.name = fileName;

      this.$emit('cropp-finished', { file, url });
      this.$refs.croppModal.close();
    },
    back() {
      this.$refs.croppModal.close();
      if (this.$route.fullPath.includes('downloadables') || this.$route.fullPath.includes('agenda')) this.$emit('clearThumbnail');
    }
  },
  computed: {
    ...mapGetters([
      'tr'
    ]),
  }
}
