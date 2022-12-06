import { mapActions, mapGetters } from 'vuex'
import func from '@/others/functions.js';

export default {
  name: 'SponsorsTab',
  components: {

  },
  created() {
    console.log('c1');

  },
  props: {
  	eventObj: Object,
  	tickets: Object,
    tiersList: Array,
    isUserSponsor: Boolean
  },
  data: function () {
    return {
      preload: false,
      // tiersList: [],
      modalMsg: '',
      tiers: [
        {
          name: 'tier1',
          status: 'disabled',
          capacity: 1,
          logo: false,
          video: false,
          pdf: false,
          poll: false,
          lottery: false,
          banner: false,
          price: {
            ticket_name: '',
            ticket_price: '',
            ticket_qty: '',
            ticket_descr: '',

            off_ticket_name: '',
            off_ticket_price: '',
            off_ticket_qty: '',
            off_ticket_descr: '',
            ticket_nameTouched: false,
            ticket_priceTouched: false,
            ticket_qtyTouched: false,
            ticket_descrTouched: false,
          }
        },
        {
          name: 'tier3',
          status: 'disabled',
          capacity: 1,
          logo: false,
          video: false,
          pdf: false,
          poll: false,
          lottery: false,
          banner: false,
          price: {
            ticket_name: '',
            ticket_price: '',
            ticket_qty: '',
            ticket_descr: '',

            off_ticket_name: '',
            off_ticket_price: '',
            off_ticket_qty: '',
            off_ticket_descr: '',
            ticket_nameTouched: false,
            ticket_priceTouched: false,
            ticket_qtyTouched: false,
            ticket_descrTouched: false,
          }
        },
        {
          name: 'tier2',
          status: 'enabled',
          capacity: 1,
          logo: false,
          video: false,
          pdf: false,
          poll: false,
          lottery: false,
          banner: false,
          price: {
            ticket_name: '',
            ticket_price: '',
            ticket_qty: '',
            ticket_descr: '',

            off_ticket_name: '',
            off_ticket_price: '',
            off_ticket_qty: '',
            off_ticket_descr: '',
            ticket_nameTouched: false,
            ticket_priceTouched: false,
            ticket_qtyTouched: false,
            ticket_descrTouched: false,
          }
        },
      ],
    }
  },

  methods: {
  	...mapActions([
      'apiGetTiersForVisitors',
      'getTierPricing',
      'buyTicket',
      'apiCreateTier'
    ]),
    jointTheEvent(id) {
    	this.buyTicket({
    		body: {
  				"event":this.eventObj.id,
  				"buyer": 2,
  				"pricing": id,
  				"payment_status": "payed"
    		},
    		callback: (response) => {
    			console.log('buyTicket', response);
    		}
    	});
    },
    formattedPrice(price, currency) {
      return func.price(price, currency); 
    },
    buyTier(tier) {
      this.apiCreateTier({
        eventId: tier.event,
        tierId: tier.id
      });
    },

    openModal() {
      this.$refs.sponsorModal.open();
    },
    closeModal() {
      this.$refs.sponsorModal.close();
    },
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
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
       
    }
    
  }
}
