// import Tinymce from '@tinymce/tinymce-vue'
// import {Editor, Toolbar} from "vue-mobiledoc-editor"
// import Mobiledoc from "vue-mobiledoc-editor"
import VueUploadComponent from 'vue-upload-component';
// import Mobiledoc, { Editor, MobiledocToolbar } from "vue-mobiledoc-editor"
import Mobiledoc, {MobiledocToolbar, createMobiledoc, EMPTY_MOBILEDOC, compToCard } from "vue-mobiledoc-editor"
import datepicker_lang from '@/others/datepicker_lang.js';
import imageCard from '@/cards/Image.vue'



import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'
import ArticlesList from '../ArticlesList/ArticlesList.vue';

export default {
  name: 'Articles',
  props: {
    event_id: Number,
    eventObj: Object,
    articleData: Object
  },
  components: {
    VueUploadComponent,
    MobiledocToolbar,
    ArticlesList,
    Editor: Mobiledoc.Editor,
    EditorButton: Mobiledoc.Button,
    EditorToolbar: MobiledocToolbar,
  },
  created() {

  },
  data: function () {
    return {
      statusEdited: false,
      status: '',
      imgInput: null,
      search_stand_owners: '',
      articleTitle: '',
      articleContent: '',
      articleDescription: '',
      articleTouched: false,
      articleDescTouched: false,
      publishTime: '',
      publishDate: null,
      datepicker_lang: datepicker_lang,
      preload: false,
      modalMsg: '',
      modalTitle: '',
      tags: [],
      tag: '',
      curEditor: null,
      cards: [
        compToCard(imageCard),
        {
           name: 'simage',
           type: 'dom',
           edit: true,
           render() {
             // let src = payload.src || 'http://placekitten.com/100x100';
             // let img = document.createElement('img');
             // img.src = src;
             return 'img';
           }
          }
      ],
      contentFiles: [],
      fileIndexes: [],
      fi: 0,
      added: false,
      EditorKey: 1,
      newForm: false
    }
  },
  methods: {
    ...mapActions([
      'apiAddArticle',
      'getUploadFileUrl',
      'uploadFiles',
    ]),
    setFormStatus(val) {
      this.newForm = val;
    },
    statusContent(val) {
      this.statusEdited = val;
    },
    didCreateEditor(evt) {
      this.curEditor = evt;
    },
    insertImage(evt) {
      const evnt = new Event('click')
      const focusEvt = new Event('focus');
      document.getElementById('mobiledoc-editor_editor').dispatchEvent(evnt);
      document.getElementById('imgcard').dispatchEvent(evnt);
      this.$forceUpdate();
    },
    fileGetSrc(file) {
      let eurl = '';
      let reader = new FileReader();
      return reader.onload = () => {
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(file);
    },
    savePost(evt) {
      this.articleData.articleContent = JSON.stringify(evt);
    },
    checkValidation() {
      const errorsArr = [];

      if (!this.articleData.articleTitle) {
        errorsArr.push(' Article title is required');
      }

      if (!this.articleData.articleContent) {
        errorsArr.push(' Article content is required');
      }

      if (!this.articleData.articleDescription) {
        errorsArr.push(' Article description is required');
      }

      if (this.articleData.articleDescription.length > 200) {
        errorsArr.push('Article description max. length is 200');
      }

      if (!this.articleData.articleBranding.articleBanner.new.length) {
        errorsArr.push('Thumbnail must be uploaded');
      }

      if (!this.articleData.articleBranding.articleCover.new.length) {
        errorsArr.push('Banner must be uploaded');
      }


      if (!errorsArr.length) {
        return true;
      } else {
        this.articleTouched = true;
        this.articleDescTouched = true;
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
    send(status) {
      this.added = false;
      if (!this.checkValidation()) {
        return false;
      }
      this.preload = true;
      const articleData = {
        event: this.event_id,
        stand: null,
        company: null,
        strings: [
          {category: "name", value: this.articleData.articleTitle},
          {category: "description_long", value: this.articleData.articleContent},
          {category: "description_short", value: this.articleData.articleDescription}
        ],
        images: []
      };
      if (this.tags.length) {
        articleData.tags = [];
        this.tags.forEach(item => {
          articleData.tags.push(item.text);
        })
      }
      if (status == 'published') {
        articleData.status = 'published';
        if (this.publishDate && this.publishTime) {
          articleData.published = func.dayListToDatestring(this.publishDate, this.publishTime.value);
        }
      }
      this.apiAddArticle({
        articleData: articleData,
        branding: this.articleData.articleBranding,
        articleBranding: this.articleData.articleBranding,
        callback: (response) => {
          this.articleData.articleTitle = '';
          this.articleData.articleContent = '';
          this.articleData.articleDescription = '';
          this.articleData.placeholders = {
            article_main_preview_url: false,
            article_banner_preview_url: false,
          };
          this.articleData.articleBranding = {
            articleCover: {
              new: [],
              url: '',
            },
            articleBanner: {
              new: [],
              url: '',
            },
            maps: {},
          };
          this.articleData.instagram = '';
          this.articleData.facebook = '';
          this.articleData.linkedin = '';
          this.articleData.twitter = '';
          this.articleData.articleDescription = '';
          this.articleTouched = false;
          this.articleDescTouched = false;
          this.tags = [];
          this.publishDate = null;
          this.publishTime = '';
          this.preload = false;
          this.EditorKey += 1;
          if (response.data.statusCode == '200') {
            this.openModal([], this.tr('adev_articles_article_added'));
          } else {
            this.openModal([response.data.body], this.tr('error'));
          }
          this.added = true;
        }
      })


    },
    inputFile(newFile, oldFile) {
      // if (this.$refs.upload)
      if ( !newFile ) {this.articleData.placeholders.article_main_preview_url = false;
        this.articleData.placeholders.article_main_preview_url = false;
        return false;
      }
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.articleData.placeholders.article_main_preview_url = reader.result;
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },
    inputBannerFile(newFile, oldFile) {
      if ( !newFile ) {this.articleData.placeholders.article_banner_preview_url = false;
        this.articleData.placeholders.article_banner_preview_url = false;
        return false;
      }
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.articleData.placeholders.article_banner_preview_url = reader.result;
        this.$forceUpdate();
      }

      let url =  reader.readAsDataURL(newFile.file);
    },

    inputBannerFilter(newFile, old, prevent) {
      newFile.imagetype="banner";
    },

    removeImage(type) {
      if (type == 'banner') {
        this.articleData.articleBranding.articleBanner.url = this.articleData.placeholders.article_banner_preview_url = false;
        this.articleData.articleBranding.articleBanner.new = [];
        this.articleData.articleBranding.articleBanner.todelete = true;
      } else {
        this.articleData.articleBranding.articleCover.url = this.articleData.placeholders.article_main_preview_url = false;
        this.articleData.articleBranding.articleCover.new = [];
        this.articleData.articleBranding.articleCover.todelete = true;
      }
      this.$forceUpdate();

    },
    editImage(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },

  },
  computed: {
    ...mapGetters([
      'tr',
      'config'
    ]),
    coverUrl() {
      return this.articleData.placeholders.article_main_preview_url ? this.articleData.placeholders.article_main_preview_url : this.articleData.articleBranding.articleCover.url;
    },
    bannerUrl() {
      return this.articleData.placeholders.article_banner_preview_url ? this.articleData.placeholders.article_banner_preview_url : this.articleData.articleBranding.articleBanner.url;
    },
    curSymbol() {
      return this.config.currencySign;
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
    cardOptions () {
      return {
        getEditorVm: () => this.$refs.editorComponent.editorVm
      }
    },
  }
}
