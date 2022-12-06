<template>
  <div class="main">
    <div class="main_form_box">

      <div class="main_section downloadables_main_section">

        <div v-if="newForm">


          <p class="text" v-if="sponsor">{{ tr('adev_sponsor_text') }}</p>
          <p class="text" v-else>{{ tr(locPrefix + 'downl_text') }}</p>

          <div class="form_input_row hero_drop thumbnail_drop">

            <VueUploadComponent
              input-id="thumbnail"
              ref="thumbnail"
              v-model="thumbnail"
              :drop="'.thumbnail_drop'"
              :multiple="false"
              @input-file="inputFile"
              :drop-directory="false"
              class="upload_image_iconstyle mb-24"

            >

              <div v-if="thumbnailPlaceholder" class="preview_image_box">
                <img :src="thumbnailPlaceholder"/>
              </div>

              <div class="placeholder_text" v-if="!thumbnailPlaceholder">
                <img src="@/img/file_input_icon.svg" alt="" class="file_upload_icon">
                <p class="file_upload_title">{{ fileTitle }}</p>
                <p class="file_upload_desc">{{ tr(locPrefix + 'event_cover_ph_desc') }}</p>
              </div>

              <div class="icons_box" v-if="thumbnailPlaceholder">
                <span @click="removeThumbnail"><img src="@/img/remove_icon.svg"/></span>
                <span @click="editThumbnail"><img src="@/img/edit_icon.svg"/></span>
              </div>
            </VueUploadComponent>
          </div>

          <div class="form_input_row" v-if="sponsor">
            <ui-textbox
              :label="tr('sponsor_link')"
              :placeholder="tr('sponsor_link_ph')"
              v-model="filmLink"
            />
          </div>

          <div class="form_input_row thumbnail_drop">
          </div>

          <div class="mb-16 height_80">

            <label class="typo__label lb_style"> {{ tr(locPrefix + 'categories_label') }}</label>
            <multiselect :options="value" :custom-label="customLabel" :show-labels="false"
                         :value="tags" :multiple="true" :searchable="true" :max-height="150"
                         @select="onSelect($event,'create')" @open="getTags()"
                         :taggable="true" @remove="onTouch($event,'create',null)" @tag="addTag('create',$event,null)"
                         ref="Vueselect"
                         @search-change="onChangeTag($event,'create')"
                         tag-placeholder="Press enter or comma to create a tag"
            >
              <template slot="option" slot-scope="props">
                <div class="option__desc">
                  <span class="option__title">{{ props.option.text }}</span>
                </div>
              </template>
            </multiselect>

          </div>

          <div class="form_input_row">
            <button class="btn btn_orange" @click="addFile">{{ tr(locPrefix + 'add_sponsor') }}</button>
          </div>

        </div>

        <div class="main_section agenda_main_section flex btn_action" v-if="!newForm" @click="newForm = true">
          <button class="btn btn_oval">+</button>
          <span class="btn_oval_text">{{ tr(locPrefix + 'new_sponsor') }}</span>
        </div>

        <p class="main_section_title big_text" v-if="sponsor">{{ tr(locPrefix + 'custom_sponsors_added') }}</p>
        <p class="main_section_title big_text" v-else>{{ tr(locPrefix + 'downl_added') }}</p>

        <ul class="file_uploaded_list" :class="{'product-wrapper': sponsor}">
          <template v-for="(file, index) in content">
            <li class="file_uploaded_list_item" v-if="!file.edit" :key="file.id">
              <div class="content flex jcsb">
                <div class="file_uploaded_list_item_url" @click="getFileLink(file)" :class="{'file': !sponsor}">
                  <div class="info">
                    <img :src="file.url" v-if="file.url" class="thumbnail"/>
                    <div class="text">
                      <p class="file_uploaded_list_item_title">{{ file.title || file.name }}</p>
                      <p class="file_uploaded_list_item_meta">{{ file.fileType }} - {{ file.size }} KB</p>
                    </div>
                  </div>
                </div>
                <div class="controls">
                  <span class="controls_item" @click="editExistFile(file, index)" v-if="sponsor">
                    <img src="@/img/edit_sec.svg"/>
                  </span>
                  <span class="controls_item ml-8" @click="removeExistFile(file.id, index)">
                     <img src="@/img/trash_sec_bold.svg"/>
                  </span>
                  <span v-if="$store.getters.getEditedItem.length && $store.getters.getEditedItem.includes(file.id)">
                     <ui-tooltip>{{tr('dont_forget_save')}}</ui-tooltip><img src="../img/edited_dot.svg"/>
                 </span>
                </div>
              </div>
              <div class="tags" v-if="fileTags(file)">
                {{ fileTags(file) }}
              </div>
            </li>
            <li class="file-edit-wrapper mb-20" :key="file.id" v-else>
              <div class="form_input_row" :class="[`thumb_droparea${index}`]">
                <VueUploadComponent
                  :input-id="'thumbInput'+index"
                  :ref="'thumb_upload'+index"
                  v-model="file.thumbnail"
                  :drop="'.thumb_droparea'+index"
                  :multiple="false"
                  @input-file="existedFile($event, index, 'thumb')"
                  class="upload_image_iconstyle mb-24"
                  :drop-directory="false"
                >
                  <div v-if="file.url" class="preview_image_box">
                    <img :src="file.url">
                  </div>
                  <div v-if="!file.url" class="placeholder_text">
                    <img src="@/img/image_placeholder_img.svg" class="file_upload_icon">
                    <p class="file_upload_title">{{ tr('event_collection_ph') }}</p>
                    <p class="file_upload_desc">{{ tr('event_cover_ph_desc') }}</p>
                  </div>

                  <div class="icons_box" v-if="file.url">
                    <span @click="editThumbnail"><img src="@/img/edit_icon.svg"/></span>
                  </div>
                </VueUploadComponent>
              </div>

              <div class="form_input_row">
                <ui-textbox
                  :label="tr('sponsor_link')"
                  :placeholder="tr('sponsor_link_ph')"
                  v-model="file.filmLink"
                />
              </div>

              <div class="mb-16 height_80">
                <label class="typo__label lb_style"> {{ tr(locPrefix + 'categories_label') }}</label>
                <multiselect :placeholder="tr('tags_collection_list')" :options="value"
                             :custom-label="customLabel" :show-labels="false" @open="getTags()"
                             :value="file.tagsList" :multiple="true" :searchable="true" :max-height="150"
                             @select="onSelect($event,'edit',index)"
                             :taggable="true" @remove="onTouch($event,'edit',index)" @tag="addTag('edit',$event,index)"
                             ref="VueselectSec"
                             @search-change="onChangeTag($event,'edit',index)"
                             tag-placeholder="Press enter or comma to create a tag"
                >
                  <template slot="option" slot-scope="props">
                    <div class="option__desc">
                      <span class="option__title">{{ props.option.text }}</span>
                    </div>
                  </template>
                </multiselect>
              </div>


              <div class="buttons flex">
                <button class="btn btn_owhite" @click="file.edit = false">{{ tr('back') }}</button>
                <button class="btn btn_orange ml-20" @click="editFile(file,index)">{{ tr('update') }}</button>
              </div>
            </li>
          </template>
          <!-- NEW FILES -->
          <template v-if="!sponsor">
            <li v-for="file, index in downloadables.new" class="file_uploaded_list_item">
              <div class="info">
                <img src="@/components/SettingsComponents/Downloadables/img/uploaded_file_icon.svg" alt="">
                <div class="text">
                  <p class="file_uploaded_list_item_title">{{ file.fileTitle ? file.fileTitle : file.name }}</p>
                  <p class="file_uploaded_list_item_meta">{{ getFileType(file.name) }} -
                    {{ Math.round((file.size / 1024)) }} KB</p>
                </div>
              </div>
              <div class="controls">
                <span class="controls_item small_text">({{ tr('new') }})</span>
                <span class="controls_item" @click="removeFile(file, index)"><img
                  src="@/components/SettingsComponents/Downloadables/img/trash_dark.svg" alt=""></span>
              </div>
            </li>
          </template>
          <!--      /* added sponsor */ -->
          <template v-else>
            <li v-for="file, index in downloadables.new" class="file_uploaded_list_item">
              <div class="new_card_spc">
                <div class="info">
                  <img :src="file.thumbnailPlaceholder" v-if="file.thumbnailPlaceholder" class="thumbnail"/>

                  <div class="text">
                    <p class="file_uploaded_list_item_title">
                      {{ file.fileName }}
                      <span class="text-bold small_text">({{ tr('new') }})</span>
                    </p>
                  </div>
                </div>
                <div class="content flex jcsb">
                  <div class="controls">
                    <!--                      <span class="controls_item" @click="editNewFile(file)">-->
                    <!--                        <img src="@/img/edit_sec.svg"/>-->
                    <!--                      </span>-->
                    <span class="controls_item ml-8" @click="removeFile(file, index)">
                        <img src="@/components/SettingsComponents/Downloadables/img/trash_dark.svg" alt="">
                      </span>
                  </div>
                </div>
              </div>
              <div class="tags" v-if="fileTags(file)">
                {{ fileTags(file) }}
              </div>
            </li>
          </template>
        </ul>
      </div>
    </div>
    <ui-modal ref="messageAgendaModal" class="status_modal" removeHeader size="auto">
      <div class="status_modal_wrapper">
        <div class="content">
          <p class="modal_title">{{ tr('validation_error') }}</p>
          <p class="modal_text" v-html="modalMsg">{{ modalMsg }}</p>
        </div>
      </div>

    </ui-modal>
    <CroppModal ref="croppModal" :croppRatio="211/211" @cropp-finished="croppFinished" @clearData="clearThumbnail"/>
  </div>
</template>

<script>
import VueUploadComponent from 'vue-upload-component';
import {mapActions, mapGetters} from 'vuex';
import helper from '@/others/functions.js';
import CroppModal from '@/components/CroppModal/CroppModal.vue';

export default {
  name: "SponsorCustom.vue",
  props: {
    downloadables: Object,
    type: String,
    sponsor: Boolean,
    pricingTags: Array,
  },
  components: {
    VueUploadComponent,
    CroppModal,
  },
  data: function () {
    return {
      fileInput: [],
      tags: [],
      tag: '',
      thumbnail: [],
      thumbnailPlaceholder: '',
      existItems: [],
      existsponsors: [],
      selectedFileIndex: null,
      selectedNewFileIndex: null,
      selectedFileType: '',
      sponsorsToUpdate: [],
      filmLink: '',
      details: [
        {detail: 'Director', value: ''},
        {detail: 'Cast', value: ''},
      ],
      priceTags: this.pricingTags,
      curtag: '',
      modalMsg: '',
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
    openAgendaModal(msg) {
      this.modalMsg = msg;
      this.$refs.messageAgendaModal.open();
    },
    agendaModalClose() {
      this.$refs.messageAgendaModal.close();
    },
    clearThumbnail() {
      this.thumbnail = [];
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
        if (this.downloadables.exist[key].tags?.includes('type:sponsor')) {
          const existsponsor = {
            ...this.downloadables.exist[key],
            edit: false,
            tagsList: this.downloadables.exist[key].tags.filter(tag => tag !== 'type:sponsor').map(tag => {
              return {text: tag}
            }),
          };
          try {
            existsponsor.detailsParsed = JSON.parse(this.downloadables.exist[key].about) || [];
          } catch {
            existsponsor.detailsParsed = [];
          }
          this.existsponsors.push(existsponsor);
        } else {
          this.existItems.push(this.downloadables.exist[key]);
        }
      });
    },
    removeFile(file, index) {
      this.downloadables.new.splice(index, 1);
      this.$refs.upload.remove(file);
    },
    removeExistFile(id, index) {
      if (this.sponsor) {
        this.existsponsors.splice(index, 1);
      } else {
        this.existItems.splice(index, 1);
      }
      this.$store.commit('remItemDownl', id);
      this.downloadables.maps[id] = false;
      let removedSponsor = Object.values(this.downloadables.maps).reduce((a, item) => a + !item, 0);
      this.$store.commit('setRemovedSposnor',removedSponsor);
      this.$store.commit('setRemCustSponsor',id);

    },
    getFileType(file_name) {
      // let arr = file_name.split('.');
      // return arr[arr.length - 1];
    },
    addFile() {
      if (this.tag != '') this.tagsChanged(tag, false);
      if (this.tags.length < 1) {
        this.openAgendaModal('Categories required');
        return false;
      }
      if (this.thumbnail.length) {
        this.thumbnail[0].fileName = this.thumbnail[0].file.name;
        this.thumbnail[0].tags = [];
        this.tags.forEach(tag => {
          this.thumbnail[0].tags.push(tag.text ? tag.text : tag);
        });
        if (this.sponsor) {
          this.thumbnail[0].tags.push('type:sponsor');
          this.thumbnail[0].filmLink = this.filmLink;
          this.thumbnail[0].thumbnailPlaceholder = this.thumbnailPlaceholder;
          this.thumbnail[0].edit = false;
          this.thumbnail[0].tagsList = this.tags;
        }

        this.downloadables.new = [...this.downloadables.new, this.thumbnail[0]];
        this.$forceUpdate();
        this.tags = [];
        this.tag = '';
        this.thumbnail = [];
        this.thumbnailPlaceholder = '';
        this.filmLink = '';
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
        this.existsponsors[index][fileType] = [];
        return false;
      }
      let reader = new FileReader();
      this.selectedNewFileIndex = null;
      this.selectedFileIndex = index;
      this.selectedFileType = fileType;
      reader.onload = () => {
        this.$refs.croppModal.open(reader.result, this.existsponsors[index][fileType]);
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

        this.thumbnail[0] = data;
        this.thumbnail[0].file = data.file;
        this.thumbnailPlaceholder = data.url;
      }

    },
    fileTags(file) {
      const tags = file.tags?.filter(item => item !== 'type:sponsor' && item.text !== 'type:sponsor')
        .map(item => item.text || item);
      return tags?.length ? `Categories: ${tags.join(', ')}` : '';
    },
    getFileLink(file) {
      if (this.sponsor) return;
      window.open(file.url);
    },
    editExistFile(file) {
      file.edit = true;
    },
    editNewFile(file) {
      file.edit = false;
      this.editedNewFile();
    },
    editedNewFile() {
      this.$forceUpdate();
    },
    tagsChanged(newTags, file) {
      if (!file) {
        this.tags = newTags;
      } else {
        file.newTags = newTags;
        file.Tags = newTags;
      }
    },
    editFile(file, index) {
      this.$store.commit('passEditedHint',file.id);
      const sponsorExist = this.sponsorsToUpdate.find(sponsor => sponsor.id === file.id);
      const fileToSave = {...file};
      const details = fileToSave.detailsParsed.filter(item => item.detail && item.value);
      if (details.length) {
        fileToSave.details = JSON.stringify(details);
      }
      if (sponsorExist) {
        this.sponsorsToUpdate = this.sponsorsToUpdate.map(sponsor => {
          return sponsor.id === file.id ? fileToSave : sponsor;
        });
      } else {
        this.sponsorsToUpdate.push(fileToSave);
      }
      this.sponsorsToUpdate.forEach(spo => {
        if (spo.id == this.existsponsors[index].id && spo.tagsList.length) {
          this.existsponsors[index].tags = []
          spo.tagsList.forEach(tag => this.existsponsors[index].tags.push(tag.text))
        }
      })
      file.edit = false;
      this.$store.commit('changeTypeAdded', 'sponsor');
      this.$emit('sponsors-updated', this.sponsorsToUpdate);
    },
    saveNewFile(file) {
      const tags = file.newTags || file.tags;
      file.tags = tags.map(tag => {
        return tag.text || tag;
      });
      file.tags.push('type:sponsor');
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
        file.detailsParsed.push({detail: '', value: ''});
      } else {
        this.details.push({detail: '', value: ''});
      }
      this.$forceUpdate();
    },
    getTags() {
      if (this.existsponsors.length) {
        this.existsponsors.forEach(spons => {
          if (spons.tags.length > 1 && spons.tags.includes("type:sponsor")) spons.tags.forEach(tag => {
            if (tag !== 'type:sponsor') {
              this.value.push(
                {text: tag}
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
    onTouch(e, typeAction, index) {
      if (typeAction === 'create') {
        if (this.tags.length) {
          this.tags.forEach((val, ind, object) => {
            if (val.text == e.text) {
              this.value.push(
                {
                  'text': val.text
                }
              )
              object.splice(ind, 1);
            }
          });
        }
      } else if (typeAction === 'edit') {
        this.existsponsors[index].tagsList.forEach((val, ind, object) => {
          if (val.text == e.text) {
            this.value.push(
              {
                'text': val.text
              }
            )
            object.splice(ind, 1);
          }
        });

        this.value = this.value.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.text === value.text
          ))
        )
      }

    },
    onChangeTag(val, typeAction, index) {
      if (val.slice(-1) === ',') {
        this.addTag(typeAction, val.slice(0, -1), index);
        const vueSelFirst = this.$refs.Vueselect
        const vueSelSec = this.$refs.VueselectSec
        if (vueSelFirst) vueSelFirst.isOpen = false;
        if (vueSelSec[0]) vueSelSec[0].isOpen = false;
      }
    },
    addTag(typeAction, newTag, ind) {
      if (typeAction === 'create') {
        this.tags.push(
          {
            'text': newTag,
          }
        )
        this.tags = this.tags.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.text === value.text
          ))
        )

      } else if (typeAction === 'edit') {
        this.existsponsors[ind].tagsList.push(
          {
            'text': newTag,
          }
        )
        this.existsponsors[ind].tags = [...new Set(this.existsponsors[ind].tags)];
        this.existsponsors[ind].tagsList = this.existsponsors[ind].tagsList.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.text === value.text
          ))
        )
      }


    },

    onSelect(option, typeAction, index) {
      if (typeAction === 'create') {
        this.tags.push(
          {
            'text': option.text
          },
        )
        this.tags = this.tags.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.text === value.text
          ))
        )
      } else if (typeAction === 'edit') {
        this.existsponsors[index].tagsList.push(
          {
            'text': option.text
          },
        )
        this.existsponsors[index].tags.push(option.text);
        this.existsponsors[index].tags = [...new Set(this.existsponsors[index].tags)];
        this.existsponsors[index].tagsList = this.existsponsors[index].tagsList.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.text === value.text
          ))
        )
      }

    },
    customLabel({text}) {
      return `${text} `
    },
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    locPrefix() {
      return this.type == 'stand' ? 'edst_' : 'adev_';
    },
    fileTitle() {
      return this.fileInput && this.fileInput.length ? this.fileInput[0].name : this.fileTitleText;
    },
    fileSubtitle() {
      return this.fileInput && this.fileInput.length ? this.getFileType(this.fileInput[0].name) + ' - ' + Math.round((this.fileInput[0].size / 1024)) + 'KB' : this.tr('image_deteil_hint');
    },
    fileTitleText() {
      return this.sponsor ? this.tr('image_drag_drop') : this.tr(this.locPrefix + 'downl_file_main');
    },
    content() {
      return this.sponsor ? this.existsponsors : this.existItems;
    }
  },
  watch: {
    downloadables: {
      handler: function (newVal) {
        if (this.existsponsors.length < 1 && this.existItems.length < 1) this.getExist();
      },
      deep: true
    },
  },
  mounted() {
    !this.content.length ? this.newForm = true : this.newForm = false;
    this.existsponsors = this.existsponsors.filter(item => !this.$store.getters.getRemCustSponsor.includes(item.id));
    this.existItems = this.existItems.filter(item => !this.$store.getters.getRemCustSponsor.includes(item.id));
  }
}


</script>

<style scoped>

.new_card_spc {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: start;
}

.height_80 {
  height: 80px;
}

.lb_style {
  font-size: 10px;
  line-height: 156%;
  color: #386D7D;
  padding: 0 4px;
}

</style>
