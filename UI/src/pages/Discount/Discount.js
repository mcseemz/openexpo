import { mapGetters, mapActions } from 'vuex';
import func from '@/others/functions.js';
import NotFound from '@/components/NotFound/NotFound.vue';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "discount" */ '@/../locales/discount/'+lang+'.json')
};

export default {
  name: 'Discount',
  components: {
    NotFound
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });
  },
  created() {
    if (!this.$route.params.discountHash) return;

    const { discountHash } = this.$route.params;

    this.apiGetDiscountInfo({
      discountHash,
      callback: (response) => {
        this.globalPreload = false;

        if (response.data.statusCode === 200 && response.data.body.is_active) {
          this.discountAvailable = true;
          this.discount = response.data.body;
        }
      }
    });
  },
  data: function () {
    return {
      localesLoaded: false,
      discountAvailable: false,
      globalPreload: true,
      discount: {}
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'getLocale',
      'routes'
    ]),
  },
  methods: {
    ...mapActions(['apiGetDiscountInfo']),
    createEventWithDiscount() {
      localStorage.setItem('openexpoDiscountHash', this.discount.id);
      this.$router.push('/add-event');
    }
  }
}
