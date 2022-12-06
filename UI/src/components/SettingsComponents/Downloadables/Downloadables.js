import VueUploadComponent from 'vue-upload-component';
import { mapActions, mapGetters } from 'vuex';
import helper from '@/others/functions.js';
import CroppModal from '@/components/CroppModal/CroppModal.vue';
import func from '@/others/functions.js';

export default {
  name: 'Downloadables',
  props: {
    downloadables: Object,
    type: String,
    product: Boolean,
    pricingTags: Array,
    category: String
  },
  components: {
    VueUploadComponent,
    CroppModal,
  },
  mounted() {
    if(this.category) {
      this.categorySel ?  this.details = [
          { detail: 'Director', value: '' },
          { detail: 'Cast', value: '' },
        ]
        : this.details = [
          { detail: 'Price', value: '' },
          { detail: 'Dimensions', value: '' },
        ]
    }
    !this.content.length ? this.newForm = true : this.newForm = false;
    if(this.$store.getters.getRemDownload.length > 0 && this.existItems.length > 0) {
      this.existItems = this.existItems.filter(item => !this.$store.getters.getRemDownload.includes(item.id));
    }
    if(this.$store.getters.getRemProduct.length > 0 && this.existProducts.length > 0) {
      this.existProducts = this.existProducts.filter(item => !this.$store.getters.getRemProduct.includes(item.id));
    }
  },
  data: function () {
    return {
      fileNameInpt: '',
      fileDescInpt: '',
      fileInput: [],
      tags: [],
      tag: '',
      thumbnail: [],
      thumbnailPlaceholder: '',
      existItems: [],
      existProducts: [],
      selectedFileIndex: null,
      selectedNewFileIndex: null,
      selectedFileType: '',
      productsToUpdate: [],
      filmLink: '',
      details: [
        { detail: 'Price', value: '' },
        { detail: 'Dimensions', value: '' },
      ],
      priceTags: this.pricingTags,
      isTouched: false,
      value: [],
      options: [],
      tagsList: [],
      newForm: false
    }
  },
  created() {
    this.getExist()
  },
  methods: {
    ...mapActions([
      'getUploadFileUrl',
      'uploadFiles',
      'getDownloadFileUrl',
    ]),
    getTags() {
      if(this.existProducts.length) {
        this.existProducts.forEach(downl => {
          if (downl.tags.length > 1 && downl.tags.includes("type:product")) downl.tags.forEach(tag => {
            if (tag !== 'type:product') {
              this.value.push(
                {text: tag, tiClasses: [{0: "ti-valid"}]}
              )
            }
          })
        })
        this.value = this.value.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.text === value.text
          ))
        )
        this.value.sort((a, b) => a.text.localeCompare(b.text))
        this.value = [...new Set(this.value)];
      }
    },
    getExist() {
      const keys = Object.keys(this.downloadables.exist);

      keys.forEach(key => {
        const parcedPriceTags = this.priceTags?.map(tag => {
          return {
            ...tag,
            selected: this.downloadables.exist[key].pricingTags.includes(tag.value)
          }
        });
        this.downloadables.exist[key].priceTags = parcedPriceTags;
        if (this.downloadables.exist[key].tags?.includes('type:product')) {
          const existProduct = {
            ...this.downloadables.exist[key],
            edit: false,
            tagsList: this.downloadables.exist[key].tags.filter(tag => tag !== 'type:product').map(tag => {
              return { text: tag }
            }),
          };
          try {
            existProduct.detailsParsed = JSON.parse(this.downloadables.exist[key].about) || [];
          } catch {
            existProduct.detailsParsed = [];
          }
          this.existProducts.push(existProduct);
        } else {
          if(!this.downloadables.exist[key].tags.includes('type:sponsor')) this.existItems.push(this.downloadables.exist[key]);
        }
      });
      this.getTags();
    },
    clearThumbnail() {
      this.thumbnail = [];
    },
    removeFile(file, index) {
      this.downloadables.new.splice(index, 1);
      this.$refs.upload.remove(file);
    },
    removeExistFile(id, index) {
      if (this.product) {
        this.existProducts.splice(index, 1);
        this.$store.commit('setRemProduct',id);
      } else {
        this.$store.commit('setRemDownload',id);
        this.existItems.splice(index, 1);
      }
      this.downloadables.maps[id] = false;
      let curLenght = Object.values(this.downloadables.maps).filter((v) => v === false);
      this.$store.commit('setRemoveValDown',curLenght.length);

    },
    getFileType(file_name) {
      if (file_name) {
        let arr = file_name.split('.');
        return arr[arr.length - 1];
      }
      return
    },
    onTouch(e,typeAction,index) {
      if(typeAction === 'create') {
        if(this.tags.length) {
          this.tags.forEach((val,ind,object) => { if(val.text == e.text){
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
        this.existProducts[index].tagsList.forEach((val,ind,object) => { if(val.text == e.text){
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
    onChangeTag(val,typeAction,index) {
      if(val.slice(-1) === ',') {
        this.addTag(typeAction,val.slice(0, -1),index);
        const vueSelFirst = this.$refs.Vueselect
        const vueSelSec = this.$refs.VueselectSec
        if(vueSelFirst) vueSelFirst.isOpen = false ;
        if(vueSelSec[0]) vueSelSec[0].isOpen = false ;
      }
    },
    addTag(typeAction,newTag,ind) {
      if(typeAction === 'create'){
        this.tags.push(
          {
            'text': newTag,
            'tiClasses': [{0: "ti-valid"}]
          }
        )
      } else if(typeAction === 'edit'){
        this.existProducts[ind].tagsList.push(
          {
            'text': newTag,
            'tiClasses': [{0: "ti-valid"}]
          }
        )
      }


    },

    onSelect(option,typeAction,index) {
      if(typeAction === 'create') {
        this.value = this.value.filter(tag => tag.text !== option.text)
        this.tags.push(
          {
            'text': option.text,
            'tiClasses': [{0: "ti-valid"}]
          },
        )
      }else if(typeAction === 'edit') {
        this.value = this.value.filter(tag => tag.text !== option.text);
        this.existProducts[index].tagsList.push(
          {
            'text': option.text,
            'tiClasses': [{0: "ti-valid"}]
          },
        )
        this.existProducts[index].tags.push( option.text )
      }

    },
    customLabel({text}) {
      return `${text} `
    },
    addFile() {
      if (this.fileDescInpt.length > 4000 || this.fileNameInpt.length > 200) {
        return false;
      }
      if (this.fileInput.length ) {

        this.fileInput[0].fileName = this.fileInput[0].name;
        this.fileInput[0].fileTitle = this.fileNameInpt;
        this.fileInput[0].fileDesc = this.fileDescInpt;
        this.fileInput[0].tags = [];
        this.fileInput[0].thumbnail = this.thumbnail;
        this.tags.forEach(tag => {
          this.fileInput[0].tags.push(tag.text ? tag.text : tag);
        });
        if (this.product) {
          this.fileInput[0].tags.push('type:product');
          this.fileInput[0].filmLink = this.filmLink;

          const details = this.details.filter(item => item.detail && item.value);
          if (details.length) {
            this.fileInput[0].details = JSON.stringify(details);
          }
          this.fileInput[0].thumbnailPlaceholder = this.thumbnailPlaceholder;
          this.fileInput[0].edit = false;
          this.fileInput[0].tagsList = this.tags;
          this.fileInput[0].detailsParsed = details;
        }
        this.getTags();
        // this.fileInput[0].priceTags = [...this.priceTags];
        this.downloadables.new.push(this.fileInput[0]);
        this.fileInput = [];
        this.fileNameInpt = this.fileDescInpt = '';
        this.tags = [];
        this.tag = '';
        this.thumbnail = [];
        this.thumbnailPlaceholder = '';
        this.filmLink = '';
        this.tagsList = [];
        this.details = [
          { detail: 'Director', value: '' },
          { detail: 'Cast', value: '' },
        ];

        // this.priceTags = this.pricingTags.map(tag => {
        //   return { ...tag, selected: false }
        // });

      }
    },
    existedNewFile(newFile, index) {
      if (!newFile) {
        this.downloadables.new[index].thumbnail = [];
        return false;
      }
      let reader = new FileReader();
      this.selectedFileIndex = null;
      this.selectedNewFileIndex = index;

      reader.onload = () => {
        this.$refs.croppModal.open(reader.result, this.downloadables.new[index].thumbnail);
      }

      let url = reader.readAsDataURL(newFile.file);
    },
    existedFile(newFile, index, fileType) {
      if (!newFile) {
        this.existProducts[index][fileType] = [];
        return false;
      }
      let reader = new FileReader();
      this.selectedNewFileIndex = null;
      this.selectedFileIndex = index;
      this.selectedFileType = fileType;

      reader.onload = () => {
        this.$refs.croppModal.open(reader.result, this.existProducts[index][fileType]);
      }

      let url = reader.readAsDataURL(newFile.file);
    },
    inputFile(newFile, oldFile) {
      if (!newFile) {
        this.thumbnail = [];
        return false;
      }
      let reader = new FileReader();
      this.selectedNewFileIndex = null;
      this.selectedFileIndex = null;
      this.selectedFileType = '';

      reader.onload = () => {
        this.$refs.croppModal.open(reader.result, this.thumbnail);
      }

      let url = reader.readAsDataURL(newFile.file);
    },
    removeThumbnail() {
      this.thumbnail = [];
      this.thumbnailPlaceholder = '';
    },
    editThumbnail(evt) {
      evt.target.closest('.file-uploads').querySelector('input').click();
    },
    croppFinished(data) {
      if (this.selectedFileIndex || this.selectedFileIndex === 0) {
        this.existProducts[this.selectedFileIndex][this.selectedFileType][0].file = data.file;
        if (this.selectedFileType === 'hero') {
          this.existProducts[this.selectedFileIndex].url = data.url;
        } else if (this.selectedFileType === 'thumb') {
          this.existProducts[this.selectedFileIndex].thumbnail = data.url;
        }
      } else if (this.selectedNewFileIndex || this.selectedNewFileIndex === 0) {
        this.downloadables.new[this.selectedNewFileIndex].thumbnail[0].file = data.file;
        this.downloadables.new[this.selectedNewFileIndex].thumbnailPlaceholder = data.url;
        this.$forceUpdate();
      } else {
        this.thumbnail[0].file = data.file;
        this.thumbnailPlaceholder = data.url;
      }
    },
    fileTags(file) {
      const tags = file.tags?.filter(item => item !== 'type:product' && item.text !== 'type:product')
        .map(item => item.text || item);
      return tags?.length ? `Tags: ${tags.join(', ')}` : '';
    },
    getFileLink(file) {
      if (this.product) return;
      window.open(file.url);
    },
    editExistFile(file) {
      file.edit = true;
    },
    editNewFile(file) {
      file.edit = !file.edit;
      this.editedNewFile();
    },
    editedNewFile() {
      this.$forceUpdate();
    },
    tagsChanged(newTags, file) {

      if (!file) {
        this.tags = newTags;
      } else {
        file.tagsList = newTags;
        file.newTags = newTags;
        file.tags.push(newTags[length].text);
      }
    },
    editFile(file,ind) {
      const productExist = this.productsToUpdate.find(product => product.id === file.id);
      const fileToSave = {...file};
      const details = fileToSave.detailsParsed.filter(item => item.detail && item.value);
      if (details.length) {
        fileToSave.details = JSON.stringify(details);
      }
      if (productExist) {
        this.productsToUpdate = this.productsToUpdate.map(product => {
          return product.id === file.id ? fileToSave : product;
        });
      } else {
        this.productsToUpdate.push(fileToSave);
      }

      this.$store.commit('passEditedHint',file.id);
      this.existProducts[ind].tags = [];
      this.existProducts[ind].tagsList.forEach(item => this.existProducts[ind].tags.push(item.text));


      this.productsToUpdate.forEach((updated,index) =>{ updated.tags = [], updated.tagsList.forEach(item => this.productsToUpdate[index].tags.push(item.text));})

      file.edit = false;
      this.productsToUpdate.forEach( pr => pr.tags.push('type:product'))

      this.$emit('products-updated', this.productsToUpdate)

    },
    saveNewFile(file) {
      const tags = file.newTags || file.tags;
      file.tags = tags.map(tag => {
        return tag.text || tag;
      });
      file.tags.push('type:product');
      file.tagsList = tags;
      const details = file.detailsParsed.filter(item => item.detail && item.value);
      file.details = JSON.stringify(details);
      file.edit = false;
      this.$forceUpdate();
    },
    removeDetail(index, file) {
      if (file) {
        file.detailsParsed.splice(index, 1);
      } else {
        this.details.splice(index, 1);
      }
      this.$forceUpdate();
    },
    addDetail(file) {
      if (file) {
        file.detailsParsed.push({ detail: '', value: '' });
      } else {
        this.details.push({ detail: '', value: '' });
      }
      this.$forceUpdate();
    },
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    categorySel() {
     return this.category && this.category === 'FilmMedia' ?  true : false ;
    },
    locPrefix() {
      return this.type == 'stand' ? 'edst_' : 'adev_';
    },
    fileTitle() {
      return this.fileInput && this.fileInput.length ? this.fileInput[0].name : this.fileTitleText;
    },
    fileSubtitle() {
      return this.fileInput && this.fileInput.length ? this.getFileType(this.fileInput[0].name) + ' - ' + Math.round((this.fileInput[0].size/1024)) + 'KB' : this.fileSubtitleText;
    },
    fileSubtitleText() {
      return this.product ? 'JPEG or PNG, no larger than 10MB.' : 'PDF no larger than 10MB';
    },
    fileTitleText() {
      return this.product ? 'Drag & drop or click to add hero banner' : this.tr(this.locPrefix+'downl_file_main');
    },
    content() {
      return this.product ? this.existProducts : this.existItems;
    }
  },
  watch: {
    downloadables: {
      handler: function (newVal) {
          if(this.existProducts.length < 1 && this.existItems.length < 1 ) this.getExist();
      },
      deep: true
    }

  }
}
