import { mapActions, mapGetters, mapState } from 'vuex'
import {expirationOptions} from '@/store/modules/enum';

export default {
  name: 'TicketsTab',
  components: {

  },
  props: {
  	eventObj: Object,
  	tickets: Object,
    customFields: Array,
  },
  data: function () {
    return {
      ticketsList: null,
      preload: false,
      userFields: [],
      pricingId: null,
      chosenPrice: null,
    }
  },

  methods: {
  	...mapActions([
      'buyTicket',
      'apiUpdateUser'
    ]),
    toExternalTickURL() {
      if (this.eventObj.externalTicketUrl) {
        let routeData = this.eventObj.externalTicketUrl
        let newUrl;
        if(routeData.includes("https://")) {
          newUrl = routeData
        } else newUrl = "https://" + routeData
        window.open(newUrl, '_blank').focus();
        return;
      }
    },
    forceUpdate() {
      this.$forceUpdate();
    },
    jointTheEvent(id) {
      // this.$emit('open-register-modal', id);
      this.$refs.ticketModal.open();
    },

    jointPrepaidTheEvent() {
      this.$router.push({ path: `/${this.routes.checkout}/${this.routes.checkout_success}/${this.$route.params.id}?orderId=${response.data.body.id}&p=${this.cartTotal}&method=${this.paymentMethod}&q=${this.qty}` });
    },
    
    buyTicketAction(id) {

      const pricing = this.eventObj.pricing.find(el=> el.id===id);
      if (!pricing) return;
      
      this.chosenPrice = pricing;

      if (this.eventObj.externalTicketUrl && pricing.access_price != '0') {
        this.$router.push('/'+this.routes.checkout+'/'+this.eventObj.id);
      } else if (pricing.access_price == '0' || pricing.manualApproval) {
        this.preload = true;
        this.buyTicket({
          body: {
            "event":this.eventObj.id,
            "buyer": this.userData ? this.userData.id : '',
            "pricing": id,
            "payment_status": "payed"
          },
          callback: (response) => {
            this.preload = false;
            if (response.data.statusCode == '200') {
              this.openModal();
            }
          }
        });
      } else {
        this.$refs.ticketErrorModal.open();
      }

    },
    openModal() {
      this.$refs.ticketModal.open();
    },
    closeModal() {
      this.$refs.ticketModal.close();
      this.$emit('ticked_bought');
      this.$router.push({path: '/'+this.routes.event+'/'+this.eventObj.id+'/main', params: { buyTicketSuccess: 'true' }}).then(()=>{
        this.$router.go(0);
      });
    },
    closeErrorModal() {
      this.$refs.ticketErrorModal.close();
    },
    getPricingExpirationString(expiration) {
      if (!expiration) return '';
      const [duration=0, type=expirationOptions.NONE] = expiration.replace(/\'/g, '').split(/(\d+)/).filter(Boolean);
      const expirationType = expirationOptions[Object.keys(expirationOptions).find(el=>el.startsWith(type.toUpperCase()))];
      const label = this.tr(`ticket_expiration_type_${expirationType.toLowerCase()}`)
      return `${this.tr('ticket_expiration_type_label')} ${duration} ${label}`;
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
    ]),
    ...mapState([
      'userData',
    ]),

    priceF() {
      const currs = {
        'EUR': '€',
        'USD': '$'
      };
      if (this.eventObj.pricing && this.eventObj.pricing.access_price && currs[this.eventObj.pricing.access_currency]) {

        if (this.eventObj.pricing.access_price == '0') {
          return 'Free';
        }
        return currs[this.eventObj.pricing.access_currency]+this.eventObj.pricing.access_price;

      } else {
        return '';
      }

    },

    joinPricingTooltip() {
      const result = [];
      if (this.chosenPrice) {
        if (this.chosenPrice.manualApproval) {
          result.push(this.tr('ticket_manual_approval'));
        }

        if (this.chosenPrice.expiration) {
          result.push(this.getPricingExpirationString(this.chosenPrice.expiration));
        }
      }

      return result;
    }
  },
  watch: {
    'eventObj.pricing': function (newVal, oldVal) {
      if (newVal.id && this.userData) {
        if (localStorage.getItem('eventRegistrationId') || this.userData.email === this.$route.query.email) {
          if (this.$route.query.auth !== 'challenge') {
            this.buyTicketAction(newVal.id);
          }
          localStorage.removeItem('eventRegistrationId');
          this.$router.replace({'query': null}).catch(err => {});
        }
      }
    }
  }
}
