import { mapActions, mapGetters } from 'vuex'
import func from '../../others/functions.js';
import datepicker_lang from '../../others/datepicker_lang.js';

import eventMixin from '../../mixins/event/event.js';
import keenui from '@/plugins/keenUi';
import configs from '@/../configs';

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "checkout" */ '@/../locales/checkout/'+lang+'.json')
};

export default {
  name: 'Checkout',
  mixins: [eventMixin],
  components: {

  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('checkout') : 'Checkout',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('checkout') : 'Checkout' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('checkout') : 'Checkout' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('checkout') : 'Checkout' },
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
    if (this.$route.query.paymentFailed) {
      this.paymentError = true;
      this.checkoutStep = true;
    }
    if (this.$route.params.tierId) {
      this.tierCheckout = true;
    }
    this.getFormattedEvent(this.$route.params.id, (resp) => {
      // this.$forceUpdate();
      this.apiGetTiersForVisitors({
        eventId: this.eventObj.id,
        callback: (response) => {
          response.data.body.forEach((item, index) => {
            if (item.id == this.$route.params.tierId) {
              this.tier = item;
              this.tier.price = {
                ticket_name: '',
                ticket_price: '',
                ticket_qty: '',
                ticket_descr: '',

                ticket_nameTouched: false,
                ticket_priceTouched: false,
                ticket_qtyTouched: false,
                ticket_descrTouched: false,
                tierId : item.id,
                currency: this.configs.currency,
              };
            
          

console.log(1)
            if (item.pricing) {
              console.log(2)

              this.getTierPricing({
                id: item.id,
                callback: (resp) => {
                  console.log('tier pricing', resp);
                  if (resp.data.statusCode == '200' && resp.data.body) {
                    item.price.exist = true;
                    item.price.ticket_price = resp.data.body.access_price;
                    item.price.ticket_qty = resp.data.body.quantity;
                    item.price.currency = resp.data.body.access_currency;
                    this.tierPrice = resp.data.body.access_price

                    if (resp.data.body.strings && resp.data.body.strings.length) {
                      resp.data.body.strings.forEach(string => {
                        if (string.category == 'name') {
                          item.price.ticket_name = string.value;
                        }
                        if (string.category == 'description_long') {
                          item.price.ticket_descr = string.value;
                        }
                      })
                    }
                  }
                  this.$forceUpdate();
                }
              })


          console.log(this.tiers);

          
              }
            }
          });
        }
      });






    });
    console.log(this.eventBranding);
  },
  data: function () {
    return {
      localesLoaded: false,
      qty: 1,
      quantityList: [0, 1, 2, 3, 4 ,5],
      evtDate: null,
      modalMsg: '',
      modalTitle: '',
      checkoutStep: false,
      usePersonalData: true,
      acceptTerms: false,
      paymentMethod: false,
      paymentError: false,
      tierCheckout: false,
      tier: null,
      tierPrice: 0,
    }
  },

  methods: {

    ...mapActions([
      'findUser',
      'checkoutPaypal',
      'buyTicket',
      'apiGetTiersForVisitors',
      'getPricing',
      'apiCreateSponsor',
      'getTierPricing'
    ]),

  	
    openModal(msg) {
      this.modalMsg = msg;
      this.$refs.messageModal.open();
    },
    formatPrice(price, currency) {
      return func.price(price, currency);
    },
    changeStep(to) {
      if ((to == 'checkout') && !this.checkoutValidator ) { return false; } 
      this.checkoutStep = !this.checkoutStep;
    },
    placeOrder() {
      if (this.placeOrderValidator && this.checkoutValidator) {
        
        this.checkoutPaypal({
          body: {

          },
          callback: (response) => {
            console.log(response);
            if (response.data && response.data.statusCode == "200" && response.data.body.id) {
              if (!this.tierCheckout) {
                this.buyTicket({
                  body: {
                    "event":this.$route.params.id,
                    "buyer": 2,
                    "pricing": this.ticket.id,
                    "payment_status": "payed"
                  },
                  callback: (response) => {
                    console.log('buyTicket', response);
                    this.$router.push({ path: `/${this.routes.checkout}/${this.routes.checkout_success}/${this.$route.params.id}?orderId=${response.data.body.id}&p=${this.cartTotal}&method=${this.paymentMethod}&q=${this.qty}` });
                  }
                });
              } else {
                this.apiCreateSponsor({
                  eventId: this.tier.event,
                  tierId: this.tier.id,
                  callback: (response) => {
                    console.log('buyTier', response);
                    if (response.data.statusCode == '405') {
                      this.openModal(this.tr('checkout_already_sponsor_msg'));
                    } else {
                      this.$router.push({ path: `/${this.routes.checkout}/${this.routes.checkout_success}/${this.$route.params.id}?orderId=${response.data.body.id}&p=${this.cartTotal}&method=${this.paymentMethod}&q=${this.qty}&type=tier` });
                    }
                    
                  }
                });
              }
              
            } else {
              this.$router.push({ path: `/${this.routes.checkout}/${this.$route.params.id}?paymentFailed=true` });
            }
          }
        })
      }
      console.log('place order');
    },
    selectPayment(method) {
      this.paymentMethod = method;
    }
	
  },
  computed: {
    ...mapGetters([
      'getLocale',
      'getAuthUser',
      'getSignedIn',
      'tr',
      'routes',
      'configs'
    ]),
    ticket() {
      return this.eventObj.pricing;
    },
    checkoutValidator() {
      return +this.qty;
    },
    placeOrderValidator() {
      return this.paymentMethod && this.acceptTerms;
    },
    cartTotal() {
      return this.cartSubtotal+this.cartFees+this.cartTax;
    },
    cartSubtotal() {
      if (!this.tierCheckout) {
        return +this.qty && this.ticket ? this.ticket.access_price * +this.qty : 0;
      } else {
        return +this.qty && this.tierPrice ? this.tierPrice * +this.qty : 0;
      }
    },
    cartFees() {
      return configs.fees ? this.cartSubtotal * (configs.fees/100): 0;
    },
    cartTax() {
      return configs.tax ? this.cartSubtotal * (configs.tax/100): 0;
    },
    ticketName() {
      if (!this.tierCheckout) {
        return this.ticket ? this.ticket.name : '';
      } else {
        return this.tier ? this.tier.price.ticket_name : '';
      }
    },
    cartTicketName() {
      if (+this.qty && this.ticket) {
        return `${this.qty} x ${this.ticketName}`;
      } else {
        return false;
      }
      
    },
    userEmail() {
      return this.$Amplify.Auth.user.attributes.email;
    },

  },
}
