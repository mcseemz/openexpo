import { mapGetters } from 'vuex';
import { Splide, SplideSlide } from '@splidejs/vue-splide';
import '@splidejs/splide/dist/css/themes/splide-default.min.css';


export default {
  name: 'SolutionsCarousel',
  props: {
    color: String,
  },
  components: {
    Splide,
    SplideSlide
  },
  data: function () {
    return {

    }
  },

  methods: {
    
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes'
    ]),
  }
}
