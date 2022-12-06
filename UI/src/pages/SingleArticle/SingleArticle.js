import TextRenderer from 'mobiledoc-dom-renderer';
import datepicker_lang from '@/others/datepicker_lang.js';

import NotFound from '@/components/NotFound/NotFound.vue';

import func from '@/others/functions.js';
import { I18n } from 'aws-amplify';
import eventMixin from '@/mixins/event/event.js';

const dict = {
  importLang: (lang) => import( /* webpackChunkName: "singlearticle" */ '@/../locales/singlearticle/'+lang+'.json')
};

import { mapActions, mapGetters } from 'vuex';

export default {
  name: 'SingleArticle',
  mixins: [eventMixin],
  metaInfo() {
    return {
      title: this.article ? this.article.articleTitle : '',
      meta: [
        { vmid: 'description', property: 'description', content: this.article ? this.article.articleTitle : '' },
        { vmid: 'og:title', property: 'og:title', content: this.article ? this.article.articleTitle : '' },
        { vmid: 'og:description', property: 'og:description', content: this.article ? this.article.articleTitle : '' },
      ],
    }
  },
  components: {
    NotFound
  },
  created(){
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.$forceUpdate();
    });
    this.apiGetOpenArticleById({
      id: this.$route.params.id,
      callback: (response) => {
        if (response.data.statusCode == 404) {
          this.article = {
            notFound: true,
          }
          if (callback) {
            callback()
          };
          return false;
        }

        this.article = this.getArticlesData(response.data.body);

        this.getFormattedEvent(response.data.body.event, () => {

          this.apiGetUser({
            id: response.data.body.editor,
            callback: (response) => {
              if (response.data.statusCode == 200) {
                this.user = func.formatUserData(response.data.body);
              }
              // this.articlesList.push(this.getArticlesData(item));
              this.$forceUpdate();
            }
          })
        });

        this.apiGetOpenArticles({
          type: 'event',
          typeId: response.data.body.event,
          status: 'published',
          recordsPerPage: 3,
          callback: (response)=>{
            if (response.data.body && response.data.body.length) {
              let i = 0;
              response.data.body.forEach(item => {
                if (this.article.id == item.id || this.related.length > 1) { return false; }

                if (!this.usersIdList.includes(item.editor)) {
                  this.usersIdList.push(item.editor);

                  this.apiGetUser({
                    id: item.editor,
                    callback: (response) => {
                      if (response.data.statusCode == 200) {
                        this.users[item.editor] = func.formatUserData(response.data.body);
                      }
                      // this.articlesList.push(this.getArticlesData(item));
                      this.$forceUpdate();
                      this.key++;
                    }
                  })

                } else {
                  // this.articlesList.push(this.getArticlesData(item));
                }
                this.related.push(this.getArticlesData(item));

              })
              this.$forceUpdate();

            }
          }
        });
      }
    })


  },
  data: function () {
    return {
      localesLoaded: false,
      datepicker_lang: datepicker_lang,
      article: null,
      user: null,
      related: [],
      usersIdList: [],
      users: {

      }
    }
  },

  methods: {

    ...mapActions([
      'apiGetUser',
      'apiGetOpenArticleById',
      'apiGetEvent',
      'apiGetOpenArticles'
    ]),
    getArticlesData(item) {
      let art = item;
      if (item.strings && item.strings.length) {
        item.strings.forEach(str => {
          if (str.category == 'name') {
            art.articleTitle = str.value;
          }
          if (str.category == 'description_long') {
            art.mobileDocContent = str.value;
            var renderer = new TextRenderer({cards: []});
            var rendered = renderer.render(JSON.parse(str.value));
            const div = document.createElement('div');
            div.appendChild(rendered.result);
            art.articleContent = div.innerHTML;
          }
          if (str.category == 'description_short') {
            art.articleDescription = str.value;
          }
        });
      }

      if (!Array.isArray(art.tags) && art.tags) {
        let tagsarr = art.tags.split(',');
        art.tags = [];
        tagsarr.forEach(item => {
          if (item) {
            art.tags.push({text: item});
          }
        });
      } else if (!Array.isArray(art.tags)) {
        art.tags = [];
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
    getDate() {
      if (!this.article.created) {
        return '-'
      }

      const date = new Date(this.article.created);
      const month = datepicker_lang.months.abbreviated[date.getUTCMonth()];
      const hours = date.getUTCHours() < 10 ? '0'+date.getUTCHours() : date.getUTCHours();
      const minutes = date.getUTCMinutes() < 10 ? '0'+date.getUTCMinutes() : date.getUTCMinutes();
let longString = `${date.getUTCDate()} ${month} ${date.getUTCFullYear()} ${hours}:${minutes} UTC ${this.eventObj.timezone}`;
      return longString
    },
    getDatePublished(item) {
      if (!item.created) {
        return {
          date: '-',
          time: '',
        }
      }
      const date = new Date(item.created);
      const hours = date.getUTCHours() < 10 ? '0'+date.getUTCHours() : date.getUTCHours();
      const minutes = date.getUTCMinutes() < 10 ? '0'+date.getUTCMinutes() : date.getUTCMinutes();

      return {
        date: item.created.split('T')[0],
        time: hours+':'+minutes
      }
    },

  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'getLocale'
    ]),
    timezone() {
      return this.eventObj.timezone > -1 ? '+'+this.eventObj.timezone : this.eventObj.timezone;
    },
    minForRead() {
      return Math.ceil(this.article.articleContent.length/1500);
    }
  }
}
