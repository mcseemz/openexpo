import { mapActions, mapGetters } from 'vuex'
import func from '../../others/functions.js';

import eventMixin from '../../mixins/event/event.js';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "checkout" */ '@/../locales/checkout/'+lang+'.json')
};

export default {
  name: 'CheckoutSuccess',
  mixins: [eventMixin],
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('checkout_success') : 'CheckoutSuccess',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('checkout_success') : 'CheckoutSuccess' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('checkout_success') : 'CheckoutSuccess' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('checkout_success') : 'CheckoutSuccess' },
      ], 
    }
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();  
    });
  },
  created(){
    // this.$router.push({ path: `/checkout/success/${this.$route.params.id}?orderId=${response.data.body.id}&p=${cartTotal}&method=${paymentMethod}&q=${qty}` });
    if (this.$route.query.orderId) {
      this.orderId = this.$route.query.orderId;
    } else {
      this.$router.push({ path: `/${this.routes.checkout}/${this.$route.params.id}?paymentFailed=true` });
    }
    if (this.$route.query.p) {
      this.price = this.$route.query.p;
    }
    if (this.$route.query.q) {
      this.qty = this.$route.query.qty;
    }
    if (this.$route.query.method) {
      this.paymentMethod = this.$route.query.method;
    }
    if (this.$route.query.type && this.$route.query.type == 'tier') {
      this.tierCheckout = true;
    }

    this.getFormattedEvent(this.$route.params.id);
  },
  data: function () {
    return {
      qty: '',
      orderId: '',
      price: '',
      paymentMethod: '',
      localesLoaded: false,
      tierCheckout: false
    }
  },

  methods: {

    ...mapActions([
      'findUser',
      'checkoutPaypal',
      'getLocale'
    ]),

    formatPrice(price) {
      return func.price(price);
    },

  },
  computed: {
    ...mapGetters([
      'getLocale',
      'getAuthUser',
      'getSignedIn',
      'tr',
      'routes',
    ]),

    userEmail() {
      return this.$Amplify.Auth.user.attributes.email;
    }
  },
}
