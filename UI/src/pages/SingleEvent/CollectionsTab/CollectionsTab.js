import { mapActions, mapGetters } from 'vuex';
import helper from '@/others/functions.js';
import datepicker_lang from '@/others/datepicker_lang.js';

export default {
  name: 'CollectionsTab',
  props: {
    eventObj: Object,
    standObj: Object,
    collections: Array,
    stands: Array,
  },
  data: () => {
    return {
      selectedCollection: null,
      parsedCollections: [],
      selectedProduct: null,
      preload: false,
      linkToFilm: false,
    }
  },
  async created() {
    this.parsedCollections = this.collections.map(collection => {
      return {
        ...collection,
        ...helper.parseStrings(collection.strings),
        ...helper.parseBranding(collection.branding),
      };
    });
  },
  methods: {
    ...mapActions([
      'getCollectionById',
    ]),
    async selectCollection(collection) {
      if (this.eventObj.letmein && collection.allowed) {
        this.preload = true;
        let collectionFull = await this.getCollectionById({ eventId: this.eventObj.id, standId: this.standObj?.id, collectionId: collection.id });
        collectionFull = collectionFull.data.body;
        const parsedItems = collectionFull.content.map((item) => {
          let heroBanner = null;
          if (item.url) {
            heroBanner = helper.url_560x315('https://'+this.configs.binary+'/'+item.url);
          }
          return {...item, ...helper.parseCollectionItem(item), heroBanner};
        });

        this.selectedCollection = {
          ...collection,
          parsedItems
        };
        this.preload = false;
      } else {
        this.openErrorModal();
      }
    },
    getImage(item) {
      return item.cover || item.banner;
    },
    getArticleDate(dateString) {
      const date = new Date(dateString);
      const month = datepicker_lang.months.abbreviated[date.getUTCMonth()];
      const day = date.getUTCDate();
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    },
    collectionItemAction(item, ref) {
      this.preload = true;
      switch (ref) {
        case 'activity':
          if (item.allowed) {
            this.$router.push(`/${this.routes.mymeetings}/${this.routes.mymeetings_video}/${item.id}`);
          } else {
            this.openErrorModal();
          }
          break;
        case 'upload':
          if (item.tags?.includes('type:product')) {
            if (item.allowed) {
              this.selectedProduct = {
                ...item,
                ...helper.parseFilmStrings(item.strings),
              };
            } else {
              this.openErrorModal();
            }
          } else {
            window.open(item.url);
          }
          break;
        case 'person':
          break;
        case 'stand':
          this.$router.push(`/${this.routes.stand}/${item.id}`);
          break;
        case 'article':
          this.$router.push(`/${this.routes.article}/${item.id}`);
          break;
        default:
          break
      }
      setTimeout(() => {
        if(this.eventObj.standMaterials){
          this.eventObj.standMaterials.forEach(material => { if(material && material.id && this.selectedProduct &&
            this.selectedProduct.id && material.strings && material.id === this.selectedProduct.id) {
            material.strings.forEach(str => str.category == 'email_content' && str.value.length > 1 ? this.linkToFilm = true : '' )
          }
          })
        }
        this.preload = false;
      },2500)
    },
    getAgendaTime(agenda) {
      const timeStart = this.getFormattedTime(agenda.start);
      const timeEnd = this.getFormattedTime(agenda.end);

      const dateStart = new Date(agenda.start);
      const dateEnd = new Date(agenda.end);

      const dayStart = dateStart.getUTCDate();
      const dayEnd = dateEnd.getUTCDate();
      const monthStart = datepicker_lang.months.abbreviated[dateStart.getUTCMonth()];
      const monthEnd = datepicker_lang.months.abbreviated[dateEnd.getUTCMonth()];

      if (dayStart !== dayEnd) {
        return `${dayStart} ${monthStart} ${timeStart} - ${dayEnd} ${monthEnd} ${timeEnd}`;
      }

      return `${dayStart} ${monthStart} ${timeStart} - ${timeEnd}`;
    },
    getFormattedTime(dateString) {
      const date = new Date(dateString);
      const tzValue = this.eventObj.timezoneObj.value;
      let hours = date.getUTCHours() + parseInt(tzValue);
      hours = hours < 10 ? '0'+hours : hours;
      let minutes = date.getUTCMinutes() < 10 ? '0'+date.getUTCMinutes() : date.getUTCMinutes();

      return `${hours}:${minutes}`;
    },
    resetCollection() {
      this.selectedCollection = null;
      this.$forceUpdate();
    },
    closeErrorModal() {
      this.$refs.errorModal.close();
    },
    openErrorModal() {
      this.$refs.errorModal.open();
    },
  },
  computed: {
    ...mapGetters([
      'routes',
      'tr',
      'configs',
    ]),
    backgroundColor() {
      return `background-color: ${this.eventObj.color || '#E5843D'}`;
    },
    textColor() {
      return `color: ${this.eventObj.color || '#E5843D'}`;
    },
    vimeoLink() {
      if (this.selectedProduct.filmLink?.includes('vimeo.com')) {
        const ids = this.selectedProduct.filmLink.split('com/')[1];
        const videoId = ids.split('/')[0];
        const hId = ids.split('/')[1];
        return `https://player.vimeo.com/video/${videoId}?h=${hId}&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479`;
      }
      return false;
    },
    filteredProductTags() {
      return this.selectedProduct.tags.filter(tag => tag !== 'type:product');
    },
    parsedFilmCast() {
      return this.selectedProduct.filmCast?.split('/').join(', ');
    },
    borderColor() {
      return `border: 1px solid ${this.eventObj.color || '#E5843D'}`;
    },
    parsedFilmDetails() {
      try {
        return JSON.parse(this.selectedProduct.about) || [];
      } catch {
        return [];
      }
    },
  }
}
