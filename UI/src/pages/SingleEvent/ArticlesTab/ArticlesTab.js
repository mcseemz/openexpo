import datepicker_lang from '@/others/datepicker_lang.js';
import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'ArticlesTab',
  components: {

  },
  props: {
    eventObj: Object,
    articlesList: Array,
    usersList: Object,
  },
  created() {
    this.$forceUpdate();
    if (this.articlesList.length) {
      this.articles = [];
      this.articlesList.forEach(item => {
        this.articles.push(this.getArticlesData(item));

      })
    }
    console.log('ARTICLES', this.articles);
  },
  data: function () {
    return {
      articles: [],

    }
  },

  methods: {
    ...mapActions([
      'apiGetArticles',
      'apiGetUser',
    ]),
    getArticlesData(item) {
      let art = item;
      if (item.strings && item.strings.length) {
        item.strings.forEach(str => {
          if (str.category == 'name') {
            art.articleTitle = str.value;
          }
          if (str.category == 'description_long') {
            art.articleContent = str.value;
          }
          if (str.category == 'description_short') {
            art.articleDescription = str.value;
          }
        });
      }

      art.articleBranding = func.getArticleBrandings(art);

      if (art.published) {
        const pDate = new Date(art.published);
        art.publishDate = pDate;
        const hours = pDate.getUTCHours() < 10 ? '0'+pDate.getUTCHours() : pDate.getUTCHours();
        const minutes = pDate.getUTCMinutes() < 10 ? '0'+pDate.getUTCMinutes() : pDate.getUTCMinutes();
            art.publishTime = hours+':'+minutes;


      } else {
        art.publishDate = null;
        art.publishTime = '';
      }
      return art;
    },
    getDateCreated(item) {
      return item.created.split('T')[0];
    },
    getDatePublished(item) {
      if (!item.published) {
        return {
          date: '-',
          time: '',
        }
      }
      const date = new Date(item.published);
      const hours = date.getUTCHours() < 10 ? '0'+date.getUTCHours() : date.getUTCHours();
      const minutes = date.getUTCMinutes() < 10 ? '0'+date.getUTCMinutes() : date.getUTCMinutes();

      return {
        date: item.published.split('T')[0],
        time: hours+':'+minutes
      }
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
    ]),
    timezone() {
      return this.eventObj.timezone > -1 ? '+'+this.eventObj.timezone : this.eventObj.timezone;
    },
    users() {
      return this.usersList;
    },
    // articles() {
    //   let res = [];
    //   this.articlesList.forEach(item => {
    //     res.push(this.getArticlesData(item));

    //   })
    //   return res;
    // }

  }
}
