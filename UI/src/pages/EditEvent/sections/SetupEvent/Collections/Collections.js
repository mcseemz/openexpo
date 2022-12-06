import {mapGetters, mapActions} from 'vuex';
import helper from '@/others/functions.js';
import func from '@/others/functions.js';
import VueUploadComponent from 'vue-upload-component';
import {Auth} from 'aws-amplify';

import slugify from 'slugify';

import Vue from "vue";
import VuejsClipper from "vuejs-clipper/dist/vuejs-clipper.umd";
import "vuejs-clipper/dist/vuejs-clipper.css";
import validName from "../../../../../mixins/validName";
import filtered from "../../../../../mixins/validName";


Vue.use(VuejsClipper);
Vue.use(VuejsClipper, {
  components: {
    clipperBasic: true,
    clipperPreview: true,
    clipperFixed: true,
  }
});

export default {
  name: 'Collections',
  mixins: [validName,filtered],
  components: {
    VueUploadComponent,
  },
  props: {
    eventObj: Object,
    agenda: Array,
    downloadables: Array,
    standObj: Object,
    pricingTags: Array,

  },
  mounted() {
    setTimeout(() => {this.getAllData()}, 4000);
  },
  data: function () {
    return {
      isTouched: false,
      value: [],
      options: [],
      selectedTopic: '',
      title: '',
      titleTouched: false,
      description: '',
      descriptionTouched: false,
      image: [],
      articles: [],
      stands: [],
      collections: [],
      loading: true,
      placeholder: '',
      urlForCropp: null,
      tagsList: [],
      tag: '',
      collectionsToDelete: [],
      collectionsToSave: [],
      selectedCollectionIndex: null,
      errors: '',
      tagsListTouched: false,
      hero: [],
      heroPlaceholder: '',
      currentImage: '',
      croppRatio: 302 / 211,
      maxTags: 1,
      priceTags: this.pricingTags,
      customName: '',
      customNameTouched: false,
      customNameWanted: false,
      customNameTimeout: false,
      customNameInputed: false,
      standsList: [],
      articlesList: [],

    }
  },
   created() {
    // getting published stands, articles and collections from event
    this.getAllData();
  },
  methods: {
    ...mapActions([
      'eventAuthGetStandsA',
      'apiGetArticlesA',
      'apiGetCollections',
      'getCollectionById',
      'eventAuthGetStands',
      'apiGetArticles',
    ]),
   async getAllData() {
      const data = await Promise.all([
        this.eventAuthGetStandsA({
          id: this.eventObj.id,
          type: 'all',
          status: 'published'
        }),
        this.apiGetArticlesA({
          type: this.standObj ? 'stand' : 'event',
          typeId: this.standObj ? this.standObj.id : this.eventObj.id,
          status: 'published'
        }),
        this.apiGetCollections({
          eventId: this.eventObj.id,
          standId: this.standObj?.id,
          user: Auth.user || this.isLinkedinSignin,
        })
      ]);

      const publishedStands = data[0]?.data?.statusCode === 200 && data[0].data.body || [];
      const publishedArticles = data[1]?.data?.statusCode === 200 && data[1].data.body || [];
      const collections = data[2]?.data?.statusCode === 200 && data[2].data.body || [];

      if (!this.standObj) {
        this.stands = publishedStands.map(stand => {
          return {
            id: stand.id,
            name: stand.strings.find(string => string.category === 'name').value
          };
        });
      }

      this.articles = publishedArticles.map(article => {
        return {
          id: article.id,
          name: article.strings.find(string => string.category === 'name').value
        };
      });
// console.log('notFormedCollection',collections)
      this.collections = collections.map(item => {
        const tags = item.tags.filter(tag => tag.indexOf('pricing:') < 0).map(tag => {
          return {text: tag}
        })

        const parcedPriceTags = this.priceTags?.map(tag => {
          return {
            ...tag,
            selected: item.tags?.includes(tag.value)
          }
        });

        return {
          ...item,
          ...helper.parseStrings(item.strings),
          ...helper.parseBranding(item.branding),
          edit: false,
          edited: false,
          image: [],
          heroNew: [],
          event: this.eventObj.id,
          tagsList: tags,
          priceTags: parcedPriceTags,
          customName: item.custom_name || ''
        }
      });

      this.collectionsToSave = JSON.parse(JSON.stringify(this.collections));

      this.collections = this.collections.filter(item => !this.$store.getters.getCurRemCollections.includes(item.id));

      this.loading = false;
      this.getStands();
      this.apiGetArticles({
        type: 'event',
        typeId: this.eventObj.id,
        status: 'published',
        callback: (response)=>{
          this.articlesList = response.data.body
        }
      });
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
    getStands() {
      this.eventAuthGetStands({
        id: this.eventObj.id,
        type: 'all',
        status: 'all',
        callback: (res) => {
          if ( res.data && res.data.statusCode == '200' && res.data.body ) {

            res.data.body.forEach((item, index) => {

              item.name = '';
              item.description_short = '';
              item.description_long = '';
              item.strings.forEach(str => {
                item[str.category] = str.value;
              });
              item.templateCoverUrl = '';
              item.templateCoverBigUrl = '';
              item.logoUrl = '';
              item.mainContentUrl = '';
              item.carouselArr = [];
              func.parseBrandings(item);

              if ( index == (res.data.body.length - 1) ) {
                this.standsList = res.data.body;
              }

            });
          }

          this.preload = false;
          this.$forceUpdate();
        }
      });
    },
    onSelect(option,typeAction,index) {
      if(typeAction === 'create') {
        this.value = this.value.filter(tag => tag.text !== option.text)
        this.tagsList.push(
          {
            'text': option.text,
            'tiClasses': [{0: "ti-valid"}]
          },
        )
      }else if(typeAction === 'edit') {
        this.value = this.value.filter(tag => tag.text !== option.text);
        this.collections[index].tagsList.push(
          {
            'text': option.text,
            'tiClasses': [{0: "ti-valid"}]
          },
        )
      }

    },
    onTouch(e,typeAction,index) {
      if(typeAction === 'create') {
        if(this.tagsList.length) {
          this.tagsList.forEach((val,ind,object) => { if(val.text == e.text){
            this.value.push(
              {
                'text': val.text,
                'tiClasses': [{0: "ti-valid"}]
              }
            )
            object.splice(ind, 1);
          } } );
        }
      } else if(typeAction === 'edit') {
        this.collections[index].tagsList.forEach((val,ind,object) => { if(val.text == e.text){
          this.value.push(
            {
              'text': val.text,
              'tiClasses': [{0: "ti-valid"}]
            }
          )
          object.splice(ind, 1);
        } } );
      }

    },
    customLabel({text}) {
      return `${text} `
    },
    touchSession(item) {
      if (item.customNameWanted) item.customName = slugify(item.name.toLowerCase(), {replacement: "-", remove: this.filtered()});
    },
    selectTopic(title) {
      this.selectedTopic = title;
      this.getTags(title);
    },
    getTags(selectedTopic) {

      this.value = [];
      if(selectedTopic.toLowerCase()  === 'agenda') {
        this.agenda.forEach(agend => {
          if (agend.tags.length > 1) agend.tags.forEach(tag => {
            if (tag !== 'type:agenda') {
              this.value.push(
                {text: tag, tiClasses: [{0: "ti-valid"}]}
              )
            }
          })
        })
      } else if(selectedTopic.toLowerCase() === 'downloadables' || selectedTopic.toLowerCase() === 'products') {
        this.downloadables.forEach(downl => {
          if (downl.tags.length > 1 && downl.tags.includes("type:product")) downl.tags.forEach(tag => {
              if (tag !== 'type:product') {
                this.value.push(
                  {text: tag, tiClasses: [{0: "ti-valid"}]}
                )
              }
          })
        })

      } else if(selectedTopic.toLowerCase() === 'articles' || selectedTopic.toLowerCase() === 'article') {
         this.articlesList.forEach(article => article.tags.forEach(tag => {
           this.value.push(
             {text: tag, tiClasses: [{0: "ti-valid"}]}
            )
         }) )

      }else if(selectedTopic.toLowerCase() === 'stands' || selectedTopic.toLowerCase() === 'stand') {
        this.standsList.forEach(stand => {
          if (stand.tags.length > 1) stand.tags.forEach(tag => {
            if (tag.includes('tag:')) {
              let curTag = tag
              curTag = curTag.replace('tag:','');
              this.value.push(
                {text: curTag, tiClasses: [{0: "ti-valid"}]}
              )
            }
          })
        })
      }
      this.value.sort((a, b) => a.text.localeCompare(b.text))
      this.value = [...new Set(this.value)];
    },
    validateCollection(collection) {
      this.errors = '';
      if (collection) {
        if (!collection.name) {
          this.errors += `<p>${this.tr('collection_title_required')}</p>`;
        }

        if (!collection.tagsList.length) {
          this.errors += `<p>${this.tr('collection_tags_required')}</p>`;
        }

        if (collection.customNameWanted && !collection.customName) {
          this.errors += `<p>${this.tr('collection_custom_name_required')}</p>`;
        }
      } else {
        if (!this.title) {
          this.errors += `<p>${this.tr('collection_title_required')}</p>`;
        }

        if (!this.tagsList.length) {
          this.errors += `<p>${this.tr('collection_tags_required')}</p>`;
        }

        if (this.customNameWanted && !this.customName) {
          this.errors += `<p>${this.tr('collection_custom_name_required')}</p>`;
        }

        if (/[<>;{}$]/.test(this.title)) {
          this.errors += `<p>${this.tr('name_not_contain_special')}</p>`;
        }
      }

      if (/[<>;{}$]/.test(this.customName)) {
        this.errors += `<p>${this.tr('name_not_contain_special')}</p>`;
      }

      if (/[а-яё]+/i.test(this.customName)) {
        this.errors += `<p>${this.tr('custom_collection_name_not_cyrillic')}</p>`;
      }

      if (this.errors) {
        this.openErrorsModal();
        return false;
      }

      return true;
    },
    addCollection() {
      if (this.tag) {
        this.tagsList.push(
          {
            text: this.tag,
            tiClasses: ['ti-valid']
          }
        )
      }
      this.titleTouched = true;
      this.descriptionTouched = true;
      this.tagsListTouched = true;
      if (this.customNameWanted) {
        this.customNameTouched = true;
      }
      if (!this.validateCollection()) {
        return;
      }
      const content = JSON.parse(JSON.stringify(this[this.selectedTopic]));

      const newCollection = {
        name: this.title,
        description: this.description,
        content,
        thumbnail: this.placeholder,
        ref: this.getRef,
        new: true,
        edit: false,
        edited: false,
        tagsList: this.tagsList,
        image: this.image,
        hero: this.hero,
        priceTags: this.priceTags,
        customName: this.customName,
        customNameWanted: this.customNameWanted,
      };
      this.collections.push(newCollection);
      this.collectionsToSave.push({...newCollection});
      this.$emit('collections-updated', {save: this.collectionsToSave, delete: this.collectionsToDelete });
      this.topicReset();
    },
    topicReset() {
      this.selectedTopic = '';
      this.title = '';
      this.description = '';
      this.titleTouched = false;
      this.descriptionTouched = false;
      this.tagsListTouched = false;
      this.tagsList = [];
      this.tag = '';
      if (this.pricingTags && this.pricingTags.length) {
        this.priceTags = this.pricingTags.map(tag => {
          return {...tag, selected: false};
        });
      }
      this.customNameWanted = false;
      this.removeImage();
      this.removeHero();
    },
    existedFile(newFile, index) {
      if (!newFile) {
        this.collections[index].thumbnail = null;
        return false;
      }
      this.selectedCollectionIndex = index;
      this.currentImage = 'image';
      this.croppRatio = 302 / 211;

      let reader = new FileReader();
      reader.onload = () => {
        this.urlForCropp = reader.result;
        this.$refs.croppModal.open();
      }

      reader.readAsDataURL(newFile.file);
    },
    existedHero(newFile, index) {
      if (!newFile) {
        this.collections[index].heroPlaceholder = null;
        return false;
      }
      this.selectedCollectionIndex = index;
      this.currentImage = 'hero';
      this.croppRatio = 2160 / 1080;

      let reader = new FileReader();
      reader.onload = () => {
        this.urlForCropp = reader.result;
        this.$refs.croppModal.open();
      }

      reader.readAsDataURL(newFile.file);
    },
    inputBannerFile(newFile) {
      if (!newFile) {
        this.placeholder = null;
        return false;
      }
      this.currentImage = 'image';
      this.croppRatio = 302 / 211;
      let reader = new FileReader();
      reader.onload = () => {
        this.urlForCropp = reader.result;
        this.$refs.croppModal.open();
      }

      reader.readAsDataURL(newFile.file);
    },
    inputHeroFile(newFile) {
      if (!newFile) {
        this.heroPlaceholder = null;
        return false;
      }
      this.currentImage = 'hero';
      this.croppRatio = 2160 / 1080;
      let reader = new FileReader();
      reader.onload = () => {
        this.urlForCropp = reader.result;
        this.$refs.croppModal.open();
      }

      reader.readAsDataURL(newFile.file);
    },
    removeHero(event, collection) {
      if (collection) {
        collection.heroNew = [];
        collection.hero = null;
        return;
      }
      this.hero = [];
      this.heroPlaceholder = '';
    },
    editHero(event, index) {
      if (index || index === 0) {
        this.selectedCollectionIndex = index;
      }
      this.currentImage = 'hero';
      event.target.closest('.file-uploads').querySelector('input').click();
    },
    removeImage(event, collection) {
      if (collection) {
        collection.image = [];
        collection.thumbnail = null;
        return;
      }
      this.image = [];
      this.placeholder = '';
    },
    editImage(event, index) {
      if (index || index === 0) {
        this.selectedCollectionIndex = index;
      }
      this.currentImage = 'image';
      event.target.closest('.file-uploads').querySelector('input').click();
    },
    saveCropp() {
      const croppResult = this.$refs.croppBox.clip();
      const url = croppResult.toDataURL();
      if (this.selectedCollectionIndex || this.selectedCollectionIndex === 0) {
        if (this.currentImage === 'image') {
          this.collections[this.selectedCollectionIndex].thumbnail = url;
        } else {
          this.collections[this.selectedCollectionIndex].hero = url;
        }
      } else if (this.currentImage === 'image') {
        this.placeholder = url;
      } else {
        this.heroPlaceholder = url;
      }
      const blobBin = atob(url.split(',')[1]);
      const array = [];
      for (let i = 0; i < blobBin.length; i++) {
        array.push(blobBin.charCodeAt(i));
      }
      const file = new Blob([new Uint8Array(array)], {type: 'image/png'});

      if (this.selectedCollectionIndex || this.selectedCollectionIndex === 0) {
        if (this.currentImage === 'image') {
          const fileName = this.collections[this.selectedCollectionIndex].image[0].file.name;
          this.collections[this.selectedCollectionIndex].image[0].file = file;
          this.collections[this.selectedCollectionIndex].image[0].file.name = fileName;
        } else {
          const fileName = this.collections[this.selectedCollectionIndex].heroNew[0].file.name;
          this.collections[this.selectedCollectionIndex].heroNew[0].file = file;
          this.collections[this.selectedCollectionIndex].heroNew[0].file.name = fileName;
        }
        this.selectedCollectionIndex = null;
      } else if (this.currentImage === 'image') {
        const fileName = this.image[0].file.name;
        this.image[0].file = file;
        this.image[0].file.name = fileName;
      } else {
        const fileName = this.hero[0].file.name;
        this.hero[0].file = file;
        this.hero[0].file.name = fileName;
      }

      this.$refs.croppModal.close();
    },
    backCropp() {
      if (this.currentImage === 'image') {
        this.image = [];
      } else {
        this.hero = [];
      }
      this.$refs.croppModal.close();
    },
    tagsChanged(newTags, collection) {
      if (!collection) {
        this.tagsList = newTags;
      } else {
        collection.tagsList = newTags;
      }
    },
    getItemsText(item) {
      const contentSize = item.contentSize || 0;
      return `${contentSize} item${contentSize > 1 ? 's' : ''}`;
    },
    getNameByRef(ref) {
      switch (ref) {
        case 'activity':
          return 'agenda'
        case 'upload':
          return '_products'
        case 'user':
          return 'user'
        case 'stand':
          return '_stands'
        case 'news':
          return 'articles'
        default:
          return 'none'
      }
    },
    updateCollection(index, collection) {
      if (!this.validateCollection(collection)) {
        return;
      }

      this.$store.commit('passEditedHint',collection.id);
      collection.edit = false;
      collection.edited = true;
      this.collectionsToSave[index] = JSON.parse(JSON.stringify(collection));
      if (collection.image[0]) {
        this.collectionsToSave[index].image[0].file = collection.image[0].file;
      }
      if (collection.heroNew[0]) {
        this.collectionsToSave[index].heroNew[0].file = collection.heroNew[0].file;
      }
      this.$emit('collections-updated', {save: this.collectionsToSave, delete: this.collectionsToDelete});
    },
    resetCollection(index, collection) {
      const baseCollection = JSON.parse(JSON.stringify(this.collectionsToSave[index]));
      collection.edit = false;
      collection.name = baseCollection.name;
      collection.content = baseCollection.content;
      collection.tagsList = baseCollection.tagsList;
      collection.image = baseCollection.image;
      collection.thumbnail = baseCollection.thumbnail;
    },
    deleteCollection(index) {
      const collection = this.collections[index];
      if (collection.id) {
        this.collectionsToDelete.push(collection.id);
      }

      this.collections.splice(index, 1);
      this.collectionsToSave.splice(index, 1);
      this.$emit('collections-updated', {save: this.collectionsToSave, delete: this.collectionsToDelete});
      this.$store.commit('curRemCollection',collection.id);
    },
    openErrorsModal() {
      this.$refs.errorsModal.open();
    },
    closeErrorsModal() {
      this.$refs.errorsModal.close();
    },
    maxTagsReached(event) {
      this.tag = '';
    },
    //custom
    customNameInput(inputed) {
      if (inputed) {
        this.customNameInputed = true;
      }
      this.customName = slugify(this.customName.toLowerCase(), {replacement: "-", remove: this.filtered()});

      if (this.customNameTimeout) {
        clearTimeout(this.customNameTimeout);
      }

      if (this.customName) {
        this.customNameTimeout = setTimeout(() => {
          this.$emit('custom-name-change');
        }, 1000);
      }
    },

    TitleInputAction() {
      if (!this.customNameInputed && this.customNameWanted) {
        this.customName = slugify(this.title.toLowerCase());
        this.customNameInput(false);
      }
    },

    eventNameInputAction() {
      if (this.customNameWanted) {
        this.customName = slugify(this.title.toLowerCase(), {replacement: "-", remove: this.filtered()});
      }
    },
    forceUpdateEvent() {
      this.eventNameInputAction();
      this.$forceUpdate();
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'isLinkedinSignin',
    ]),

    bannerUrl() {
      return this.placeholder;
    },
    getRef() {
      switch (this.selectedTopic) {
        case 'agenda':
          return 'activity'
        case 'downloadables':
          return 'upload'
        case 'staff':
          return 'user'
        case 'stands':
          return 'stand'
        case 'articles':
          return 'news'
        default:
          return 'none'
      }
    },
  },
}
