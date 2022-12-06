import VueUploadComponent from 'vue-upload-component';
import func from '@/others/functions.js';
import {mapActions, mapGetters, mapState} from 'vuex'
import config from '@/../configs';

export default {
  name: 'Personnel',
  props: {
    mainObj: Object,
    eventObj: Object,
    type: String,
  },
  components: {
    VueUploadComponent
  },
  created() {
    let personnelRdy = false;
    let companyUsersRdy = false;
    let rolesRdy = false;
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

    this.apiGetRoles({
      type: 'company',
      callback: (response) => {
        if (response.data.statusCode == '200') {
          this.companyRolesList = response.data.body;
          this.$forceUpdate();
        }
      }
    });

    this.apiGetCompanyInvitations({
      callback: (response) => {
        if (response.data.statusCode == '200' && response.data.body.length) {
          this.companyInvitationsList = response.data.body;
          this.$forceUpdate();
        }
      }
    });

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

    // this.apiGetInvitations({
    //   type: this.type,
    //   typeId: this.mainObj.id,
    //   callback: (response) => {
    //     if (response.data.statusCode == '200' && response.data.body.length) {
    //       this.invitationsList = response.data.body;
    //       this.$forceUpdate();
    //     }
    //   }
    // });

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
  data: () => ({
    orderBy: {
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
    preload: true,
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
    UserRoleValue: null,
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
    emailFilled: false,
    curId: new Number(),
    modalclose: false,
    refImage: false,
    leftKey: 1,
    modKeeper: true,
    modalStatus: false,
    value: [],
    options: [],
    priceList: [],
    Pricing: [],
    priceId: null,
    email_valid: true,
  }),
  mounted() {

    this.$watch(
      () => {
        return this.$refs.addNewPersonnel.isOpen;
      },
      (val) => {
        setTimeout(() => {
          if (val == false && !this.modKeeper) {
            this.editedModal = false;
            this.emailFilled = false;
            this.clearImageKey();

          }
        },200)

      }
    )
    this.pricingNames

  },
  watch: {
    companyEmailAddresses(newVal) {
      if (newVal == '') this.updateUserPublic = false
    },
    editedModal(newVal) {
      if(!newVal) {
        setTimeout(() => this.$forceUpdate(),500)
        setTimeout(() => this.pricingNames,1000)
        setTimeout(() => this.leftKey += 1,1500)
      }
    }
  },
  methods: {
    ...mapActions([
      'apiGetRoles',
      'apiGetPersonnel',
      'apiAddPersonnel',
      'apiGetCompanyUsers',
      'apiGetUser',
      'sendInvitation',
      'apiGetInvitations',
      'apiCancelInvitation',
      'apiGetCompanyInvitations',
      'apiUpdatePersonnel',
      'apiCreatePersonnel',
      'apiDeletePersonnel',
      'uploadFilePersonnel',
      'apiEditPersonnel',
      'deleteApi'
    ]),
    copyURL(payloadLink,ind) {
      var dummy = document.createElement("textarea");
      document.body.appendChild(dummy);
      dummy.value = payloadLink;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
      this.userList[ind].copied = true;
      this.leftKey += 1;
      setTimeout(() => {this.userList[ind].copied = false,this.leftKey += 1},2000);
    },
    getTags() {
      this.pricingNames;
    },
    onSelect(option) {
      this.Pricing = [];
      this.priceId = 0;
      this.Pricing.push(option.name);
      this.priceId = option.id;
    },

    addTag() {



    },
    onTouch() {
      this.Pricing = [];
    },
    onChangeTag(val,typeAction,index) {
      // if(val.slice(-1) === ',') {
        // this.addTag(typeAction,val.slice(0, -1),index);
        // const vueSelFirst = this.$refs.Vueselect
        // const vueSelSec = this.$refs.VueselectSec
        // if(vueSelFirst) vueSelFirst.isOpen = false ;
        // if(vueSelSec[0]) vueSelSec[0].isOpen = false ;
      // }
    },
    notClose(payload) {
      if(payload){
        this.$refs.addNewPersonnel.isOpen = true;
      }
    },
    resetData() {
      this.Pricing = [];
      this.priceId = 0;
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
    refreshImage() {
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
      this.leftKey += 1;
    },
    selectedPersonOutput(event) {
      this.companyNewUserRole = event.target.value
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

      this.email_valid = email_valid;
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
      if(!this.validButton) {
        return false;
      }
      let modDisplay = document.querySelector(".person_modal .ui-modal__body");
      modDisplay.style.display = 'none';
      this.preload = true;
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
        roleid: typeof this.UserRoleValue == 'number' ? this.UserRoleValue : this.companyNewUserRole.value,
        position: this.companyJobPosition,
        text: this.companyNameUser,
        tags: tags,
        public: this.updateUserPublic,
        eventid: this.$route.params.id,
        type: this.type,
        price: this.priceId
      }

      this.apiEditPersonnel({
        PersonnelData,
        callback: (response) => {
          this.preload = true;
          if (this.personnel.logo.new.length > 0) {
            this.uploadFilePersonnel({
              id: this.$route.params.id,
              post_type: this.type,
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
                      this.preload = prcNamefalse;
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
          this.editedModal = false;
          this.emailFilled = false;
          setTimeout(() => {
            modDisplay.style.display = '';
          },1000)

        }
      });
      let personnelRdy = false;
      let companyUsersRdy = false;
      let rolesRdy = false;
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

      this.apiGetRoles({
        type: 'company',
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.companyRolesList = response.data.body;
            this.$forceUpdate();
          }
        }
      });

      this.apiGetCompanyInvitations({
        callback: (response) => {
          if (response.data.statusCode == '200' && response.data.body.length) {
            this.companyInvitationsList = response.data.body;
            this.$forceUpdate();
          }
        }
      });

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

      // this.apiGetInvitations({
      //   type: this.type,
      //   typeId: this.mainObj.id,
      //   callback: (response) => {
      //     if (response.data.statusCode == '200' && response.data.body.length) {
      //       this.invitationsList = response.data.body;
      //       this.$forceUpdate();
      //     }
      //   }
      // });

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
      this.pricingNames

      // setTimeout(() => { this.filteredUserList, console.log('this.filteredUserList',this.filteredUserList), this.forceUpdate(),this.leftKey += 1} ,4000)
    },
    addPerson() {
      if(!this.validButton) {
        return false;
      }
      let modDisplay = document.querySelector(".person_modal .ui-modal__body");
      modDisplay.style.display = 'none';
      this.preload = true;
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
                post_type: this.type,
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
            modDisplay.style.display = '';
          }
        });
    },
    canselRem() {
      this.$refs.messageUsersModal.isOpen = false;
    },
    ConfItem() {
      const PersonnelData = {
        id: this.curId,
        eventid: this.$route.params.id,
        type: this.type
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
      this.$refs.messageUsersModal.isOpen = false;
    },
    clearTouch() {
      this.companyEmailTouched = false;
      this.companyJobPositionTouched = false;
    },
    removePerson(id) {
      this.curId = id;
      this.$refs.messageUsersModal.isOpen = true;
    },
    editPerson(user) {
      this.Pricing = [];
      this.tags = [];
      this.priceId = 0;
      this.companyEmailAddresses = "";
      this.personnel.logo_preview_url = user.logo;
      this.rolesList.map(item => {
        if (item.id === user.role) {
          this.companyNewUserRole = item.name;
        }
      })

      if (user.branding && user.branding.length > 0) {
        this.brandingId = user.branding[0].id
      }
      if (user.tags.length > 0) {
        user.tags.map(item => this.tags.push({text: item}))
      }
      if (user.email !== '' && user.email) {
        this.companyEmailAddresses = user.email
        this.emailFilled = true;
      }
      setTimeout(() => {
        let _this = this;
        let modDisplay = document.querySelector(".person_modal .ui-modal__body");
        modDisplay.addEventListener("mouseover", function( event ) {
          _this.modKeeper = false;
        }, false);
        modDisplay.addEventListener("mouseleave", function( event ) {
          // highlight the mouseenter target
          _this.modKeeper = true;
        }, false);
      },300)
      if(user.id) {
        this.value.forEach( val => val.id === user.price ? this.Pricing.push(val.name) : '')
        this.priceId = user.price;
      }

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
      this.clearTouch();
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
      if(!this.editedModal) this.resetData();
      this.$refs.addNewPersonnel.open();
      setTimeout(() => {
        let _this = this;
        let modDisplay = document.querySelector(".person_modal .ui-modal__body");
        modDisplay.addEventListener("mouseover", function( event ) {
          _this.modKeeper = false;
        }, false);
        modDisplay.addEventListener("mouseleave", function( event ) {
          // highlight the mouseenter target
          _this.modKeeper = true;
        }, false);
      },300)

    },
    closeNewPersonnel() {
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
    prcName(user) {
      this.pricingNames
      this.Pricing = [];
      if(user.id) {
        this.value.forEach( val => val.id === user.price ? this.Pricing.push(val.name) : '')
        this.priceId = user.price;
      }
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs'
    ]),
    ...mapState([
      'userData',
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
          if (a.name  < b.name) {
            return -1;
          }
          if (a.name > b.name) {
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
          let label = user.name + ' ' + user.surname + ' - ' + user.position;
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
    },
    pricingNames() {
      let curName = '';
      if(this.mainObj && this.mainObj.pricing && this.mainObj.pricing.length) {
          for ( let i = 0; i < this.mainObj.pricing.length; i++ ) {
            this.mainObj.pricing[i].strings.forEach( str => { if(str.category == 'name') { curName = curName.concat(str.value + ',');
            this.value.push({id:this.mainObj.pricing[i].id,name:str.value})  }})
          }
        this.value.unshift({id: 0,name: ''});
      } else if (this.eventObj && this.eventObj.pricing && this.eventObj.pricing.length) {
        for ( let i = 0; i < this.eventObj.pricing.length; i++ ) {
          this.eventObj.pricing[i].strings.forEach( str => { if(str.category == 'name') { curName = curName.concat(str.value + ',');
            this.value.push({id:this.eventObj.pricing[i].id,name:str.value})  }})
        }
        this.value.unshift({id: 0,name: ''});
      } else {
        curName = ''
      }
      curName = curName.split(",").sort().join(",");
      curName = curName.substring(1);
      return curName
    },
    isEmailValid() {
      
      const result = !this.companyEmailAddresses.length || this.email_valid;

      return result;
    }
  }
}
