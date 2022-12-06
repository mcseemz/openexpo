import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'DownloadTab',
  props: {
    downloadables: Object,
    type: String
  },
  data: function () {
    return {
      filteredDownloadables:null,
    }
  },
  created() {
    this.filteredDownloadables = this.downloadables
    let keyExist = Object.keys(this.filteredDownloadables.exist)
    for (let i = 0; i < keyExist.length; i++) {
      this.filteredDownloadables.exist[keyExist[i]].tags.map(pr =>  {
        if(pr == 'type:sponsor')  this.filteredDownloadables.exist[keyExist[i]].TypeSponsor = true
        if(pr == 'type:product' ) delete this.filteredDownloadables.exist[keyExist[i]]
      })
    }

  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    locPrefix() {
      return this.type == 'stand' ? 'ss_' : 'se_';
    },
  }
}
