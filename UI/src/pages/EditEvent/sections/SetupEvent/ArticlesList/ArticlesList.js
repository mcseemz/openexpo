// import Tinymce from '@tinymce/tinymce-vue'
// import {Editor, Toolbar} from "vue-mobiledoc-editor"
// import Mobiledoc from "vue-mobiledoc-editor"
import VueUploadComponent from 'vue-upload-component';
// import Mobiledoc, { Editor, MobiledocToolbar } from "vue-mobiledoc-editor"
import Mobiledoc, { MobiledocToolbar, createMobiledoc, EMPTY_MOBILEDOC } from "vue-mobiledoc-editor"
import datepicker_lang from '@/others/datepicker_lang.js';
import { ToggleButton } from 'vue-js-toggle-button'
import TextRenderer from 'mobiledoc-dom-renderer';



import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'ArticlesList',
  props: {
    event_id: Number,
    articleData: Object,
    type: String,
    added: Boolean,
  },
  watch: {
    added(newVal) {
      if(newVal == true) this.getArticles();
    },
    articlesSearch(newVal) {
      if(newVal != false) {
        setTimeout(() => {this.searchClick() },700);
      }else this.searchClick();
    }
  },
  components: {
    VueUploadComponent,
    MobiledocToolbar,
    ToggleButton,
    Editor: Mobiledoc.Editor,
    EditorButton: Mobiledoc.Button,
    EditorToolbar: MobiledocToolbar,

  },
  created() {
    this.getArticles();
  },
  updated() {
    !this.filteredList.length ?  this.$emit('formStatus',true) : this.$emit('formStatus',false) ;
  },
  data: function () {
    return {
      search_stand_owners: '',
      articlesList: [],
      dateFilter: null,
      datepicker_lang: datepicker_lang,
      editItem: null,
      articleTouched: false,
      tmpStatus: false,
      usersIdList:[],
      preload: false,
      usersList: {

      },
      articlesSearch: '',
      searchedVal: '',
      preview: false,
      tag: '',
      modalMsg: '',
      modalTitle: '',
      statusEdited: false,
      editItemTagsList: []
    }
  },

  methods: {
    ...mapActions([
      'apiGetArticles',
      'apiUpdateArticle',
      'apiGetUser',
      'apiDeleteArticle'
    ]),
    getArticles() {
      this.preload = true;
      this.articlesList = [];
      if (this.type == 'all') {
        let pl = false;
        let dl = false;
        this.apiGetArticles({
          type: 'event',
          typeId: this.event_id,
          status: 'published',
          callback: (response)=>{
            if (response.data.body && response.data.body.length) {
              response.data.body.forEach(item => {
                if (!this.usersIdList.includes(item.editor)) {
                  this.usersIdList.push(item.editor);

                  this.apiGetUser({
                    id: item.editor,
                    callback: (response) => {
                      if (response.data.statusCode == 200) {
                        this.usersList[item.editor] = response.data.body;
                        this.$forceUpdate();
                      }
                    }
                  })

                }
                this.articlesList.push(this.getArticlesData(item));
              })

            }
            pl = true;
            if (dl && pl) {
              this.preload = false;
            }
          }
        });
        this.apiGetArticles({
          type: 'event',
          typeId: this.event_id,
          status: 'draft',
          callback: (response)=>{
            if ((response.data.statusCode == 200) && response.data.body && response.data.body.length) {
              response.data.body.forEach(item => {
                if (!this.usersIdList.includes(item.editor)) {
                  this.usersIdList.push(item.editor);

                  this.apiGetUser({
                    id: item.editor,
                    callback: (response) => {
                      if (response.data.statusCode == 200) {
                        this.usersList[item.editor] = response.data.body;
                        this.$forceUpdate();
                      }
                    }
                  })

                }
                this.articlesList.push(this.getArticlesData(item));

              })

            }
            dl = true;
            if (dl && pl) {
              this.preload = false;
            }
          }
        });
      }
      if (this.type == 'published') {
        this.apiGetArticles({
          type: 'event',
          typeId: this.event_id,
          status: 'published',
          callback: (response)=>{
            if (response.data.body && response.data.body.length) {
              response.data.body.forEach(item => {
                if (!this.usersIdList.includes(item.editor)) {
                  this.usersIdList.push(item.editor);

                  this.apiGetUser({
                    id: item.editor,
                    callback: (response) => {
                      if (response.data.statusCode == 200) {
                        this.usersList[item.editor] = response.data.body;
                        this.$forceUpdate();
                      }
                    }
                  })

                }
                this.articlesList.push(this.getArticlesData(item));

              })

            }
            this.preload = false;
          }
        });
      }
      if (this.type == 'draft') {
        this.apiGetArticles({
          type: 'event',
          typeId: this.event_id,
          status: 'draft',
          callback: (response)=>{
            if ((response.data.statusCode == 200) && response.data.body && response.data.body.length) {
              response.data.body.forEach(item => {
                if (!this.usersIdList.includes(item.editor)) {
                  this.usersIdList.push(item.editor);

                  this.apiGetUser({
                    id: item.editor,
                    callback: (response) => {
                      if (response.data.statusCode == 200) {
                        this.usersList[item.editor] = response.data.body;
                        this.$forceUpdate();
                      }
                    }
                  })

                }
                this.articlesList.push(this.getArticlesData(item));
              })

            }
            this.preload = false;
          }
        });
      }
    },
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
        let timeFromList = false;
        this.timeList.forEach(time => {
          if (time.value == hours+':'+minutes) {
            art.publishTime = time;
            timeFromList = true;
          }
        })
        if (!timeFromList) {
          art.publishTime = {
            label: `${hours}:${minutes}`,
            value: `${hours}:${minutes}`,
          }
        }

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
    goToEdit(item) {
      this.statusEdited = true;
      this.$emit('statusShow',this.statusEdited);
      this.editItemTagsList = [];
      this.editItem = {
        ...item,
        placeholders: {
          article_main_preview_url: false,
          article_banner_preview_url: false,
        }
      };
      this.editItem.tags.forEach(item => this.editItemTagsList.push({text: item}));
      this.editItem.tags = this.editItemTagsList;
      this.editItem.tags = this.editItem.tags.filter((value, index, self) =>
        index === self.findIndex((t) => (
          t.text === value.text
        ))
      )
      this.editItem.instagram = '';
      this.editItem.facebook = '';
      this.editItem.linkedin = '';
      this.editItem.twitter = '';
    },
    switchPreview() {
      this.preview = !this.preview;
    },
    goToList() {
      this.articleTouched = false;
      this.editItem = false;
    },
    savePost(evt) {
      this.editItem.articleContent = JSON.stringify(evt);
    },
    statusToggleChange() {
      if (this.editItem.status == 'draft') {
        this.editItem.status = 'published'
      } else {
        this.editItem.status = 'draft'
      }
    },
    deleteItem(item) {
      this.preload = true;
      this.apiDeleteArticle({
        id: item.id,
        callback: () => {
          this.getArticles();
          this.preload = false;
        }
      });
    },
    checkValidation() {
      const errorsArr = [];

      if (!this.editItem.articleTitle) {
        errorsArr.push(' Article title is required');
      }

      if (!this.editItem.articleContent) {
        errorsArr.push(' Article content is required');
      }

      if (!this.editItem.articleDescription) {
        errorsArr.push(' Article description is required');
      }

      if (this.editItem.articleDescription.length > 200) {
        errorsArr.push('Article description max. length is 200');
      }

      if (!this.editItem.articleBranding.articleBanner.new.length && !this.editItem.articleBranding.articleBanner.url) {
        errorsArr.push('Thumbnail must be uploaded');
      }

      if (!this.editItem.articleBranding.articleCover.new.length && !this.editItem.articleBranding.articleBanner.url) {
        errorsArr.push('Banner must be uploaded');
      }

      if (!errorsArr.length) {
        return true;
      } else {
        this.openModal(errorsArr, 'Validation error');
        return false;
      }
    },
    openModal(msg, title) {
      this.modalTitle = title ? title : '';
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.articleModal.open();
    },
    modalClose() {
      this.$refs.articleModal.close();
    },
    backToList() {
      this.statusEdited = false;
      this.editItemTagsList = [];
      this.$emit('statusShow',this.statusEdited);
      this.goToList();
    },
    send() {
      this.statusEdited = false;
      if (!this.checkValidation()) {
        return false;
      }

      let articleData1 = {...this.editItem};
      articleData1.strings = [
        {category: "name", value: this.editItem.articleTitle},
        {category: "description_long", value: this.editItem.articleContent},
        {category: "description_short", value: this.editItem.articleDescription}
      ];
      if (this.editItem.tags.length) {
        articleData1.tags = [];
        this.editItem.tags.forEach(item => {
          articleData1.tags.push(item.text);
        })
      }
      if (this.editItem.publishDate && this.editItem.publishTime) {
        articleData1.published = func.dayListToDatestring(this.editItem.publishDate, this.editItem.publishTime.value);
      }

      this.apiUpdateArticle({
        articleData: articleData1,
        branding: this.editItem.articleBranding,
        callback: (response) => {
          this.getArticles();
          this.goToList();
        }
      })
      this.$emit('statusShow',this.statusEdited);
      this.editItemTagsList = [];
    },
    inputFile(newFile, oldFile) {
      if (!newFile) {
        this.editItem.placeholders.article_main_preview_url = false;
        return false;
      }
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editItem.placeholders.article_main_preview_url = reader.result;
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },
    inputBannerFile(newFile, oldFile) {
      if (!newFile) {
        this.editItem.placeholders.article_banner_preview_url = false;
        return false;
      }

      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.editItem.placeholders.article_banner_preview_url = reader.result;
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    inputBannerFilter(newFile, old, prevent) {
      newFile.imagetype="banner";
    },

    removeImage(type) {
      if (type == 'banner') {
        this.editItem.articleBranding.articleBanner.url = this.editItem.placeholders.article_banner_preview_url = false;
        this.editItem.articleBranding.articleBanner.new = [];
        this.editItem.articleBranding.articleBanner.todelete = true;
      } else {
        this.editItem.articleBranding.articleCover.url = this.editItem.placeholders.article_main_preview_url = false;
        this.editItem.articleBranding.articleCover.new = [];
        this.editItem.articleBranding.articleCover.todelete = true;
      }
      this.$forceUpdate();

    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    forceUpdate(){
      this.$forceUpdate();
    },
    searchClick() {
      this.searchedVal = this.articlesSearch;
      this.$forceUpdate();
    },
    showContent(mobiledoc) {
      if (mobiledoc) {
        var renderer = new TextRenderer({cards: []});
        var rendered = renderer.render(JSON.parse(mobiledoc));
        const div = document.createElement('div');
        div.appendChild(rendered.result);
        return div.innerHTML;
      }
    },

  },
  computed: {
    ...mapGetters([
      'tr',
    ]),

    editorOptions() {
      if (!this.editItem) { return false; }
      return {
        mobiledoc: this.currentMobiledoc,
      }
    },
    currentMobiledoc() {
      if (!this.editItem) { return EMPTY_MOBILEDOC; }
      return JSON.parse(this.editItem.articleContent);
    },

    filteredList() {
      if (this.searchedVal) {
        return this.articlesList.filter( item => {
          return item.articleTitle && item.articleTitle.indexOf(this.searchedVal) != -1
        })
      }

      return this.articlesList;
    },
    coverUrl() {
      return this.editItem.placeholders.article_main_preview_url || this.editItem.articleBranding.articleCover.url;
    },
    bannerUrl() {
      return this.editItem.placeholders.article_banner_preview_url || this.editItem.articleBranding.articleBanner.url;
    },
    timeList() {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 12 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        original_time = original_time < 10 ? original_time : original_time;

        arr.push({ label: ''+time+':00 '+add, value: ''+original_time+':00' })
        arr.push({ label: ''+time+':15 '+add, value: ''+original_time+':15' })
        arr.push({ label: ''+time+':30 '+add, value: ''+original_time+':30' })
        arr.push({ label: ''+time+':45 '+add, value: ''+original_time+':45' })
      }

      return arr;
    },

  }
}
