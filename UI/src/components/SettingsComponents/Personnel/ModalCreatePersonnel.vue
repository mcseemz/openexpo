<template>
  <div>
    <div  :id="modalStatus ? 'modalKeeper' : ''" @click="notClose(modKeeper)" class="person_modal">
      <ui-modal ref="addNewPersonnel" class="status_modal status_modal_personnel" removeHeader size="auto">
        <div class="status_modal_wrapper">
          <div class="content">
            <div v-if="!preload" class="main_section invitations_main_section">
              <p class="big_text_personnel" v-if="!editedModal">
                {{ tr(locPrefix + 'personnel_add_personnel') }}</p>
              <p class="big_text_personnel" v-else>{{ tr(locPrefix + 'personnel_edit_personnel') }}</p>

              <div class="upload-user-img avatar_droparea">
                <div v-on:mouseover="modKeeper = false" v-on:mouseleave="modKeeper = true">
                  <VueUploadComponent
                    input-id="logoInpt"
                    ref="personnel_logo"
                    v-model="personnel.logo.new"
                    drop=".avatar_droparea"
                    :multiple="false"
                    @input-file="inputLogoFile"
                    class="personnel_avatar"
                    :drop-directory="false"
                     >


                    <div class="personnel_content flex">
                      <div class="image_box">
                        <img v-if="logoUrl" :src="logoUrl" alt="" class="personnel_image">
                      </div>
                    </div>
                    <div v-if="!logoUrl" class="placeholder_text">
                      <img src="@/img/image_placeholder_img.svg" class="file_upload_icon">
                      <p class="file_upload_title">{{ tr('event_collection_ph') }}</p>
                      <p class="file_upload_desc">{{ tr('event_cover_ph_desc') }}</p>
                    </div>

                    <div class="icons_box personel_ava_icons" v-if="logoUrl">
                      <div class="remove_icon">
                        <span><img src="@/img/remove_icon.svg" @click="clearImageKey"/></span>
                      </div>
                      <span><img src="@/img/edit_icon.svg"/></span>
                    </div>

                  </VueUploadComponent>
                </div>


              </div>

              <div class="flex-personnel-input">

                <div class="form_input_row form_input_personnel">
                  <ui-textbox
                    :label="tr('email')"
                    :placeholder="tr(locPrefix+'mycomp_users_email_ph')"
                    v-model="companyEmailAddresses"
                    class="personnel-input"
                    :invalid="companyEmailTouched && (!validateEmail(companyEmailAddresses) && companyEmailAddresses.length)"
                    @keydown="companyEmailTouched = true"
                    :disabled="modalclose"
                  >
                  </ui-textbox>
                </div>


                <div class="form_input_row form_input_personnel">
                  <ui-textbox
                    :label="tr('_name')"
                    :placeholder="tr('enter_name')"
                    v-model="companyNameUser"
                    :disabled="modalclose"
                  >
                  </ui-textbox>
                </div>


                <div class="form_input_hr form_input_personnel">
                  <ui-textbox
                    :label="tr(locPrefix+'mycomp_users_job_label')"
                    :placeholder="tr(locPrefix+'mycomp_users_job_ph')"
                    v-model="companyJobPosition"
                    :maxlength="30"
                    :invalid="(companyJobPositionTouched && !companyJobPosition.length) || (!!companyJobPosition.length && ( companyJobPosition.length > 30 ||
                                /[<>$;.,'\\\/\(\)\{\}]/.test(companyJobPosition) ))"
                    v-on:touch.passive="companyJobPositionTouched = true"
                    :disabled="modalclose"
                  >
                  </ui-textbox>
                </div>

                <div class="form_input_hr form_input_personnel">
                  <ui-select
                    :label="tr(locPrefix+'mycomp_users_role_label')"
                    :placeholder="tr(locPrefix+'mycomp_users_role_ph')"
                    :options="roles"
                    v-model="companyNewUserRole"
                    iconPosition="right"
                    :disabled="modalclose"
                  >
                    <img slot="icon" src="@/img/hsb_dropdown.svg" alt="">
                  </ui-select>
                </div>
              </div>

              <div class="form_input_row">
                <p class="form_input_row_label tag_style">
                  {{ tr(locPrefix + 'tags_label') }}
                </p>
                <vue-tags-input
                  :placeholder="tr(locPrefix+'tags_ph')"
                  v-model="tag"
                  :tags="tags"
                  :allow-edit-tags="true"
                  :add-on-key="[13,';',',']"
                  @tags-changed="newTags => tagsChanged(newTags, false)"
                  :disabled="modalclose"
                />
              </div>

              <div class="form_input_row" v-if="priceTags && priceTags.length">
                <div class="text-middle text-bold mb-16">{{ tr('pricing_tags') }}:</div>
                <div class="pricings">
                  <ui-checkbox v-model="tag.selected" v-for="tag in priceTags" :key="tag.text">
                    {{ tag.text }}
                  </ui-checkbox>
                </div>
              </div>

              <div class="flex form_checkbox_row form_checkbox_m_row">
                <ui-checkbox v-model="updateUserPublic" color="accent" :disabled="companyEmailAddresses === '' || modalclose"
                >{{ tr(locPrefix + 'personnel_ispublic') }}
                </ui-checkbox>
              </div>

              <div class="button_row_sb flex">
                <button class="btn btn_owhite"  @click="addPerson" v-if="!editedModal"> {{ tr('add_person') }}
                </button>
                <button class="btn btn_owhite" @click="saveEditedPerson" v-else> {{ tr('edit_person') }}
                </button>
              </div>

            </div>
          </div>
        </div>

        <span class="status_modal_close" @click.prevent="closeNewPersonnel"><img src="@/img/close_medium.svg" alt=""></span>
      </ui-modal>
      <ui-modal ref="messageUsersModal" class="status_modal" removeHeader size="auto">
        <div class="status_modal_wrapper">
          <div class="content">
            <p class="modal_title">{{ modalTitle }}</p>
            <p class="modal_text" v-html="modalMsg">{{ modalMsg }}</p>
          </div>
        </div>

        <span class="status_modal_close" @click="usersModalClose"><img src="@/img/close_medium.svg" alt=""></span>
      </ui-modal>
      <ui-modal ref="croppModal" dismissOn="close-button" class="status_modal cropp_modal" removeHeader size="auto">
        <div class="status_modal_wrapper">
          <div class="content">
            <clipper-fixed
              ref="croppBox"
              :src="logoUrlForCropp"
              :ratio="1"
              v-if="logoUrlForCropp"
              :round="true"
            ></clipper-fixed>
            <p class="text">
              {{ tr('myacc_scale_message') }}
            </p>
            <div class="button_box flex">
              <button class="btn btn_owhite" @click="backCropp">{{ tr('back') }}</button>
              <button class="btn btn_orange" @click="saveCropp">{{ tr('save') }}</button>
            </div>
          </div>
        </div>
      </ui-modal>
    </div>
  </div>
</template>

<script>
import {mapActions, mapGetters, mapState} from "vuex";
import VueUploadComponent from "vue-upload-component";
import func from '@/others/functions.js';

export default {
  name: "CreateModalPersonnel",
  props: {
    mainObj: Object,
    modalStatus: Boolean,
    type: String
  },
  components: {
    VueUploadComponent
  },
  created() {
    document.body.style.overflowX = "hidden";
    let personnelRdy = false;
    let companyUsersRdy = false;
    let rolesRdy = false;
    if(this.modalStatus) {
      this.apiGetPersonnel({
        type: this.type,
        typeId: this.mainObj.id,
        companyId: this.mainObj.company,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.preload = true;
            this.userList = response.data.body.length ? response.data.body : [];
            let u_i = 0;
            if (!this.userList.length) {
              this.preload = false;
            }
            this.userList.forEach((user, index) => {
              if (user.branding && user.branding.length) {
                user.branding.forEach(item => {
                  user.logo = func.url_64x64('https://' + this.configs.binary + '/' + item.url);
                });
              }
            });

          } else {
            this.userList = []
          }

          personnelRdy = true;

          if (personnelRdy && companyUsersRdy && rolesRdy) {
            this.preload = false;
          }

        }
      });
    }

    this.apiGetRoles({
      type: 'company',
      callback: (response) => {
        if (response.data.statusCode == '200') {
          this.companyRolesList = response.data.body;
          this.$forceUpdate();
        }
      }
    });

    // this.apiGetCompanyInvitations({
    //   callback: (response) => {
    //     if (response.data.statusCode == '200' && response.data.body.length) {
    //       this.companyInvitationsList = response.data.body;
    //       this.$forceUpdate();
    //     }
    //   }
    // });

    this.apiGetCompanyUsers({
      companyId: this.mainObj.company,
      callback: (response) => {
        if (response.data.statusCode == '200') {

          this.companyUsers = response.data.body.length ? response.data.body : [];
        }

        this.companyUsers.forEach(user => {
          if (user.position) {
            user.position = decodeURI(user.position);
          }
        });

        companyUsersRdy = true;

        if (personnelRdy && companyUsersRdy && rolesRdy) {
          this.preload = false;
        }

      }
    });

    this.apiGetRoles({
      type: this.type,
      callback: (response) => {
        if (response.data.statusCode == '200') {
          this.rolesList = response.data.body;

          let u_i = 0;
          if (!this.companyUsers.length) {
            rolesRdy = true;
            if (personnelRdy && companyUsersRdy && rolesRdy) {
              this.preload = false;
            }
          }
          this.companyUsers.forEach((user, index) => {

            if (user.branding && user.branding.length) {
              user.branding.forEach(item => {
                if (!item.strings && !item.strings.length) {
                  return false;
                }

                item.strings.forEach(str => {
                  if (str.category == 'description_long' && str.value == 'logo_image') {
                    this.companyUsers[index].logo = func.url_64x64('https://' + this.configs.binary + '/' + item.url);
                    ;
                  }
                });

              });

            }
            rolesRdy = true;

            if (personnelRdy && companyUsersRdy && rolesRdy) {
              this.preload = false;
            }
          });
        }
      }
    });

  },
  mounted() {
    this.$watch(
      () => {
        return this.$refs.addNewPersonnel.isOpen;
      },
      (val) => {
        if (val == false) this.$emit('closeModal')
      }
    )
  },
  watch: {
    editedModal(newVal) {
      if (newVal == false) {
        // this.clearImageKey();
        this.companyEmailAddresses = "";
        this.companyJobPosition = "";
        this.updateUserPublic = false;
        this.companyNewUserRole = {};
        this.companyNameUser = "";
        this.tags = [];
      }
    },
    companyEmailAddresses(newVal) {
      if (newVal == '') this.updateUserPublic = false
    },
    modalStatus(newVal) {
      if (newVal) {
        this.$refs.addNewPersonnel.isOpen = true;
      } else {
        this.$emit('closeModal');
        this.$refs.addNewPersonnel.isOpen = false;
      }
      this.resetData();
    }
  },
  data: () => ({
    porderBy: {
      label: 'Alphabetical name',
      value: 'name'
    },
    orderByList: [{
      label: 'Alphabetical name',
      value: 'name'
    }],
    rolesList: [],
    role: '',
    search: '',
    preload: false,
    newUserForm: false,
    email_addresses: '',
    mailtext: '',
    newUserRole: '',
    assignUserForm: false,
    newUserRoleUpdate: '',
    userList: [1, 2, 3, 4, 5],
    companyUsers: [],
    updateUserId: '',
    updateUserPublic: false,
    updateUserPosition: '',
    selectedCompanyUser: '',

    newCompanyUserForm: false,
    companyId: Number,
    companyEmailAddresses: '',
    companyNameUser: '',
    companyNewUserRole: {},
    companyJobPosition: '',
    companyJobPositionTouched: false,
    companyRolesList: [],
    companyEmailTouched: false,
    modalMsg: '',
    modalTitle: '',
    invitationsList: [],
    companyInvitationsList: [],
    tags: [],
    tag: '',
    logo_preview_url: false,
    logoUrlForCropp: false,
    personnel: {
      logo: {
        cropped: false,
        new: [],
        url: ''
      },
      logo_preview_url: ''
    },
    priceTags: [],
    editedModal: false,
    brandingId: false,
    modalclose: false,
    modKeeper: true,
  }),
  methods: {
    ...mapActions([
      'apiGetRoles',
      'apiGetPersonnel',
      'apiAddPersonnel',
      'apiGetCompanyUsers',
      'apiGetUser',
      'apiDeletePersonnel',
      'sendInvitation',
      'apiGetInvitations',
      'apiCancelInvitation',
      // 'apiGetCompanyInvitations',
      'apiUpdatePersonnel',
      'apiCreatePersonnel',
      'uploadFilePersonnel',
      'apiEditPersonnel',
      'deleteApi'
    ]),
    resetData() {
        this.companyId = Number;
        this.companyEmailAddresses = '';
        this.companyNameUser = '';
        this.companyNewUserRole = {};
        this.companyJobPosition = '';
        this.companyJobPositionTouched = false;
        this.companyRolesList = [];
        this.companyEmailTouched = false;
        this.modalMsg = '';
        this.modalTitle = '';
        this.invitationsList = [];
        this.companyInvitationsList = [];
        this.tags = [];
        this.tag = '';
        this.logo_preview_url = false;
        this.logoUrlForCropp = false;
        this.personnel= {
         logo : {
          cropped: false,
            new: [],
            url: ''
        },
        logo_preview_url: ''
      };
      this.priceTags = [];
    },
    notClose(payload) {
      if(payload){
        this.$refs.addNewPersonnel.isOpen = true;
      }
    },
    removeImage() {
      this.personnel.logo.new = [];
      this.personnel.logo_preview_url = false;
      this.$refs.croppModal.close();
    },
    clearImageKey() {
      this.personnel.logo_preview_url = '';
      this.personnel.logo = {
        cropped: false,
        new: [],
        url: ''
      };
      setTimeout(() => this.$refs.croppModal.close(), 50);
    },
    saveCropp() {
      const croppResult = this.$refs.croppBox.clip();
      const url = croppResult.toDataURL();
      this.personnel.logo_preview_url = url;
      const blobBin = atob(url.split(',')[1]);
      const array = [];

      for (let i = 0; i < blobBin.length; i++) {
        array.push(blobBin.charCodeAt(i));
      }

      const file = new Blob([new Uint8Array(array)], {type: 'image/png'});
      const fileName = this.personnel.logo.new[0].file.name;
      this.personnel.logo.new[0].file = file;
      this.personnel.logo.new[0].file.name = fileName;
      this.personnel.logo.cropped = true;
      this.$refs.croppModal.close();
    },

    backCropp() {
      this.personnel.logo.new = [];
      this.$refs.croppModal.close();
    },
    inputLogoFile(newFile, oldFile) {
      this.$refs.croppModal.open();
      if (!newFile) {
        this.personnel.logo_preview_url = false;
        return false;
      }
      this.personnel.logo.cropped = false;
      let eurl = '';
      let reader = new FileReader();

      reader.onload = () => {
        this.logoUrlForCropp = reader.result;

      }

      let url = reader.readAsDataURL(newFile.file);
    },
    forceUpdate() {
      this.$forceUpdate();
    },
    tagsChanged(newTags, file) {
      if (!file) {
        this.tags = newTags;
      } else {
        file.newTags = newTags;
      }
    },
    getCompanyRoleById(id) {
      let result = false;
      this.companyRolesList.forEach((item) => {
        if (item.id == id) {
          result = item.name;
        }
      });
      return result;
    },
    validateEmail(email) {
      let email_arr = email.split(',');
      let email_valid = true;
      email_arr.forEach((item) => {
        if (!func.validateEmail(item)) {
          email_valid = false;
        }
      });
      return email_valid;
    },
    openUsersModal(msg, title) {
      this.modalTitle = title;
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>' + item + '</p>';
      });
      this.$refs.messageUsersModal.open();
    },
    usersModalClose() {
      this.$refs.messageUsersModal.close();
    },
    sendInvitationClick() {
      const errorsArr = [];
      if (!this.companyEmailAddresses.length) {
        errorsArr.push(this.tr(this.locPrefix + 'mycomp_email_req'));
      } else {
        if (!this.validateEmail(this.companyEmailAddresses)) {
          errorsArr.push(this.tr(this.locPrefix + 'mycomp_email_invalid'));
        }

      }

      if (!this.companyNewUserRole) {
        errorsArr.push(this.tr(this.locPrefix + 'mycomp_role_req'));
      }
      if (!this.companyJobPosition.length) {
        errorsArr.push(this.tr(this.locPrefix + 'mycomp_job_position_req'));
      }
      if (this.companyJobPosition.length > 30) {
        errorsArr.push(this.tr(this.locPrefix + 'mycomp_job_position_max'));
      }
      if (this.companyJobPosition.length && /[<>$;.,'\\\/\(\)\{\}]/.test(this.companyJobPosition)) {
        errorsArr.push(this.tr(this.locPrefix + 'mycomp_job_position_symb'));
      }

      if (errorsArr.length) {
        this.openUsersModal(errorsArr, this.tr('validation_error'));
        return false;
      }

      let email_arr = this.companyEmailAddresses.split(',');
      this.preload = true;
      let e_i = 0;

      email_arr.forEach(item => {
        this.sendInvitation({
          type: this.type,
          typeId: this.mainObj.id,
          roleId: this.companyNewUserRole.value,
          email: item.trim(),
          text: this.companyNameUser.replace(/\n/g, '<br>'),
          position: this.companyJobPosition,
          callback: (response) => {

            if (e_i == (email_arr.length - 1)) {
              this.companyEmailAddresses = '';
              this.companyNameUser = '';
              this.companyNewUserRole = {};
              this.newCompanyUserForm = false;
              this.companyJobPosition = '';
              this.companyJobPositionTouched = this.companyEmailTouched = false;
              this.$refs.addNewPersonnel.close();
            }
            e_i++;
          }
        })
      })
    },
    cancelInvitation(confirmationId) {
      this.preload = true;
      this.apiCancelInvitation({
        type: this.type,
        typeId: this.mainObj.id,
        confirmationId: confirmationId,
      });
    },
    assignUser() {
      this.assignUserForm = true;
    },
    addNewUser() {
      this.newUserForm = true;
    },
    saveEditedPerson() {
      this.modalclose = true;
      this.rolesList.map(i => {
        if (i.name === this.companyNewUserRole) this.UserRoleValue = i.id
      })
      const tags = [];
      if (this.tags.length) {
        this.tags.forEach(item => {
          tags.push(item.text);
        })
      }
      const apiUrl = config ? config.api : null;
      const PersonnelData = {
        id: this.companyId,
        useremail: this.companyEmailAddresses,
        roleid: this.companyNewUserRole.value,
        position: this.companyJobPosition,
        text: this.companyNameUser,
        tags: tags,
        public: this.updateUserPublic,
        eventid: this.$route.params.id,
        type: this.type,
      }

      this.apiEditPersonnel({
        PersonnelData,
        callback: (response) => {
          this.preload = true;
          if (this.personnel.logo.new.length > 0) {
            this.uploadFilePersonnel({
              id: this.$route.params.id,
              post_type: 'event',
              file: this.personnel.logo.new[0].file,
              category: 'branding',
              ref: 'personnel',
              ref_id: response.data.body.id,
            }).then(response => {
              this.apiGetPersonnel({
                type: this.type,
                typeId: this.mainObj.id,
                companyId: this.mainObj.company,
                callback: (response) => {
                  if (response.data.statusCode == '200') {
                    this.preload = true;
                    this.userList = response.data.body.length ? response.data.body : [];
                    let u_i = 0;
                    if (!this.userList.length) {
                      this.preload = false;
                    }
                    this.userList.forEach((user, index) => {
                      if (user.branding && user.branding.length) {
                        user.branding.forEach(item => {
                          user.logo = func.url_64x64('https://' + this.configs.binary + '/' + item.url);
                        });
                      }
                    });

                  } else {
                    this.userList = []
                  }
                  this.preload = false;
                }
              })
              this.$refs.addNewPersonnel.close();
              setTimeout( () => {this.modalclose = false;},1500)
              return response;
            }).catch(err => console.log(err));
          } else {
            if (this.brandingId) {
              this.deleteApi({
                url: `https://${apiUrl}/binary/${this.brandingId}`,
                callback: (response) => {
                  console.log(response)
                }
              })
            }
            setTimeout( () => {this.modalclose = false;},1500)
            this.preload = false;
          }
          this.clearImageKey();
          this.preload = false;
          this.userList = this.userList.filter(item => item.id !== PersonnelData.id);
          this.userList.push(response.data.body);
          this.companyEmailAddresses = this.companyJobPosition = this.companyNameUser = this.tag = '';
          this.companyNewUserRole = {};
          this.tags = [];
          this.$refs.addNewPersonnel.close();
        }
      });
    },
    addPerson() {
      if(!this.validButton) {
        return false;
      }
      let modDisplay = document.querySelector(".person_modal .ui-modal__body");
      modDisplay.style.display = 'none';
      this.modalclose = true;
      const tags = [];
      if (this.tags.length) {
        this.tags.forEach(item => {
          tags.push(item.text);
        })
      }
      const PersonnelData = {
        useremail: this.companyEmailAddresses,
        roleid: this.companyNewUserRole.value,
        position: this.companyJobPosition,
        text: this.companyNameUser,
        tags: tags,
        public: this.updateUserPublic,
        eventid: this.$route.params.id,
        type: this.type
      }
      this.apiCreatePersonnel({
        PersonnelData,
        callback: (response) => {
          this.preload = true;
          if (this.personnel.logo.new.length > 0) {
            this.uploadFilePersonnel({
              id: this.$route.params.id,
              post_type: 'event',
              file: this.personnel.logo.new[0].file,
              category: 'branding',
              ref: 'personnel',
              ref_id: response.data.body.id,
            }).then(response => {
              this.apiGetPersonnel({
                type: this.type,
                typeId: this.mainObj.id,
                companyId: this.mainObj.company,
                callback: (response) => {
                  if (response.data.statusCode == '200') {
                    this.userList = response.data.body.length ? response.data.body : [];
                    let u_i = 0;
                    if (!this.userList.length) {
                      this.preload = false;
                    }
                    this.userList.forEach((user, index) => {
                      if (user.branding && user.branding.length) {
                        user.branding.forEach(item => {
                          user.logo = func.url_64x64('https://' + this.configs.binary + '/' + item.url);
                        });
                      }
                    });
                  } else {
                    this.userList = []
                  }
                  this.userList.map(item => item.id == response.data.body.id ? item.logo = this.$store.state.api.personnelAvatar.url : this)
                }
              })
              this.$refs.addNewPersonnel.close();
              setTimeout( () => {this.modalclose = false;},1500)
              return response;
            }).catch(err => console.log(err));
          } else this.preload = false;
          this.$refs.addNewPersonnel.close();
          this.preload = false;
          this.companyEmailTouched = false;
          if(response.data.statusCode == 200) this.userList.push(response.data.body);
          this.clearImageKey();
          this.clearTouch();
          this.companyEmailAddresses = this.companyJobPosition = this.companyNameUser = this.tag = '';
          this.companyNewUserRole = {};
          this.tags = [];
          this.modalclose = false;
          this.$emit('savePersonnel',response.data.body)
          setTimeout(() => {
            modDisplay.style.display = '';
          },1000)
        }
      });
    },
    clearTouch() {
      this.companyEmailTouched = false;
      this.companyJobPositionTouched = false;
    },
    removePerson(id) {
      const PersonnelData = {
        id: id,
        eventid: this.$route.params.id,
      }
      this.preload = true;
      this.apiDeletePersonnel({
        PersonnelData,
        callback: (response) => {
          if (response.data.statusCode === 200) {
            this.userList = this.userList.filter(item => item.id != PersonnelData.id)
          }
          this.preload = false;
        }
      })
    },
    editPerson(user) {
      this.personnel.logo_preview_url = user.logo
      this.rolesList.map(item => {
        if (item.id === user.role) {
          this.companyNewUserRole.value = item.id;
          this.companyNewUserRole.label = item.name;
        }
      })
      if (user.branding && user.branding.length > 0) {
        this.brandingId = user.branding[0].id
      }
      if (user.tags.length > 0) {
        user.tags.map(item => this.tags.push({text: item}))
      }
      if (user.email) this.companyEmailAddresses = user.email
      this.companyJobPosition = user.position;
      this.updateUserPublic = user.public;
      this.companyNameUser = user.name;
      this.editedModal = true;
      this.updateUserId = user.id;
      this.updateUserPublic = user.public;
      this.updateUserPosition = user.position;
      this.companyId = user.id;
      this.roles.forEach(item => {
        if (item.value == user.role) {
          this.newUserRoleUpdate = item;
        }
      });
      if (!this.newUserRoleUpdate) {
        return false;
      }
      this.$refs.addNewPersonnel.open();
    },
    getRoleById(id) {
      let result = false;
      this.rolesList.forEach((item) => {
        if (item.id == id) {
          result = item.name;
        }
      });
      return result;
    },
    addNewPersonnel() {
      this.$refs.addNewPersonnel.open();
    },
    closeNewPersonnel(event) {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      this.$refs.addNewPersonnel.close();
    },
    sendUserCallback() {
      this.apiGetPersonnel({
        type: this.type,
        typeId: this.mainObj.id,
        companyId: this.mainObj.company,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.userList = response.data.body.length ? response.data.body : [];
          } else {
            this.userList = [];
          }
          this.newUserForm = false;
          this.assignUserForm = false;
          this.newUserRoleUpdate = this.newUserRole = this.selectedCompanyUser = '';
          this.updateUserId = this.updateUserPosition = '';
          this.updateUserPublic = false;
          this.preload = false;
        }
      });
    },
    send(id = false) {
      let userId = id;
      let roleId = null;

      if (!userId) {
        userId = this.selectedCompanyUser.value;
        roleId = this.newUserRole.value;
      } else {
        roleId = this.newUserRoleUpdate.value;
      }

      if (!userId || !roleId) {
        return false;
      }
      this.preload = true;
      if (!userId) {
        this.apiAddPersonnel({
          userId: userId,
          roleId: roleId,
          type: this.type,
          typeId: this.mainObj.id,
          callback: (response) => {
            this.sendUserCallback();
          }
        });
      } else {
        this.apiUpdatePersonnel({
          userId: userId,
          roleId: roleId,
          type: this.type,
          typeId: this.mainObj.id,
          position: this.updateUserPosition,
          public: this.updateUserPublic,
          callback: (response) => {
            this.sendUserCallback();
          }
        });
      }
    },

  },
  computed: {
    ...mapGetters([
      'tr',
      'configs'
    ]),
    validButton() {
      let ifEmailNotTuchedOrValid = true;
      if ( this.companyEmailAddresses.length && !this.validateEmail(this.companyEmailAddresses)) {
        ifEmailNotTuchedOrValid = false;
      }
      if(this.companyNameUser.length && this.companyJobPosition && Object.keys(this.companyNewUserRole).length && ifEmailNotTuchedOrValid){
        return true
      }
      return false
    },
    locPrefix() {
      return this.type == 'stand' ? 'edst_' : 'adev_';
    },
    filteredUserList() {
      let result = this.userList
      if (this.search) {
        result = result.filter(item => {
          return (item.name + ' ' + item.surname).toLowerCase().indexOf(this.search.toLowerCase()) != -1;
        });
      }
      if (this.role && this.role.value) {
        result = result.filter(item => {
          return item.role == this.role.value;
        })
      }
      if (this.orderBy.value == 'name') {
        result.sort(function (a, b) {
          if (a.name + ' ' + a.surname < b.name + ' ' + b.surname) {
            return -1;
          }
          if (a.name + ' ' + a.surname > b.name + ' ' + b.surname) {
            return 1;
          }
          return 0;
        })
      }
      return result;
    },
    roles() {
      const result = [];
      this.rolesList.forEach((item) => {
        result.push({
          label: item.name,
          value: item.id
        })
      });
      return result;
    },
    companyRoles() {
      const result = [];
      this.companyRolesList.forEach((item) => {
        result.push({
          label: item.name,
          value: item.id
        })
      });
      return result;
    },
    companyUserList() {
      const result = [];
      const personnelArray = []
      this.userList.forEach(item => {
        personnelArray.push(item.id);
      });
      this.companyUsers.forEach(user => {
        if (!personnelArray.includes(user.id)) {
          let label = user.name + ' - ' + user.position;
          if (user.email) {
            label += ' - ' + user.email;
          }
          result.push({
            label: label,
            value: user.id,
          })
        }
      });
      return result;
    },
    logoUrl() {
      return this.personnel.logo_preview_url ? this.personnel.logo_preview_url : this.personnel.logo.url;
    }
  }
}
</script>

<style lang="scss" scoped>
#modalKeeper {
  width: 308% !important;
  height: 100%;
  position: absolute;
  top: -50%;
  left: -100%;
}

.personnel_avatar {
  display: flex;
  flex-direction: row;
}

.personnel_image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 50% !important;
}

.personel_ava_icons {
  width: 100% !important;
  display: flex;

  .remove_icon {
    z-index: 999;
    margin-right: 8px;
  }

  span {
    margin-right: 8px;
    cursor: pointer;
  }
}

.image_box {
  width: 64px;
  height: 64px;
  margin-right: 16px;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
}

.tag_style {
  font-size: 14px;
  line-height: 17px;
  padding-bottom: 5px;
  margin-top: 25px;
}
</style>
