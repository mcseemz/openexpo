import { mapActions, mapGetters } from 'vuex'
import VueSlickCarousel from 'vue-slick-carousel'

export default {
  name: 'FeaturedCarousel',
  props: {
    catEventList: Array
  },
  components: {
    VueSlickCarousel,

  },
  created() {
    console.log('this.catEventList', this.catEventList);
  },
  data() {
    return {
      events_list: ['ev', 'ev', 'ev', 'ev', 'ev', 'ev'],
      event_carousel_settings: {
        arrows: true,
        dots: true,
        slidesToShow: 3,
        infinite: false,
      },
    }
  },
  methods: {
  	...mapActions([    
      'setLocale',
    ]),
    showNext() {
        this.$refs.event_carousel.next()
     },
     showPrev() {
        this.$refs.event_carousel.prev()
     },
     startPricing(event) {
      const currs = {
        'EUR': '€',
        'USD': '$'
      };
      
      if (event.pricing && event.pricing.access_price && currs[event.pricing.access_currency]) {
        
        return currs[event.pricing.access_currency]+event.pricing.access_price;
          
      } else {
        return 'Free';
      }
       
    }
  },
  computed: {
  	...mapGetters([
      'getLocaleName',
      'tr',
      'routes',
    ]),
  }
}
