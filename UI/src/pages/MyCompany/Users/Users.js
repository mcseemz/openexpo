import { mapActions, mapGetters, mapState } from 'vuex'
import func from '@/others/functions.js'

export default {
  name: 'Users',
  props: {
    companyObj: Object,
  },
  components: {

  },
  created() {
    this.apiGetCompanyUsers({
      companyId: this.companyObj.id,
      callback: (response) => {
        console.log('apiGetCompanyUsers',response);
        if (response.data.statusCode == '200') {
          if (response.data.body.length) {
            let meInList = false;
            response.data.body.forEach(item => {
              this.usersList.push(item);

              if (item.id == this.userData.id) {
                this.usersList[this.usersList.length - 1].currentUser = true;
                meInList = true;
              }
              if (item.position) {
                this.usersList[this.usersList.length - 1].position = decodeURI(item.position);
              }
            });
            if (!meInList) {
              this.usersList.unshift(this.userData);
              this.usersList[0].currentUser = true;
            }
            this.$forceUpdate();
          }
          // this.usersList = response.data.body.length ? response.data.body : [];
        }

        this.apiGetCompanyInvitations({
          callback: (response) => {
            console.log('apiGetCompanyInvitations', response);
            if (response.data.statusCode == '200' && response.data.body.length) {
              this.invitationsList = response.data.body;
              console.log('invitationsList', this.invitationsList);

              this.invitationsList.forEach(user => {
                if (user.position) {
                  user.position = decodeURI(user.position);
                }
              })
            }

            let u_i = 0;
            if (!this.usersList.length) {this.preload = false}
            this.usersList.forEach((user, index) => {
              this.apiGetUser({
                id: user.id,
                callback: (response) => {
                  if (response.data.statusCode == 200) {
                    let userData = func.formatUserData(response.data.body);
                    this.usersList[index].userObj = userData.userObj;
                    this.usersList[index].userBranding = userData.userBranding;
                  }

                  if (u_i == ( this.usersList.length - 1) ) {
                    this.preload = false;
                  }
                  u_i++;
                }
              })
            });

          }
        });
      }
    });

    this.apiGetRoles({
      type: 'company',
      callback: (response) => {
        console.log('apiGetRoles',response);
        if (response.data.statusCode == '200') {
          this.rolesList = response.data.body;
          // this.preload = false;
          this.$forceUpdate();
        }
      }
    });

  },
  mounted() {

  },
  data: function () {
    return {
      orderBy: {
        label: 'Alphabetical name',
        value: 'name'
      },
      orderByList: [{
        label: 'Alphabetical name',
        value: 'name'
      }],
      rolesList: ['All', 'Admin', 'Sales', 'Moderator'],
      role: '',
      search: '',
      newUserForm: false,
      email_addresses: '',
      mailtext: '',
      newUserRole: '',
      jobPosition: '',
      usersList: [],
      preload: true,
      userForUpdate: false,
      newUserRoleUpdate: '',
      jobPositionUpdate: '',
      newJobPosition: '',
      newJobPositionTouched: false,
      userForDelete: false,
      deleteReason: '',
      invitationsList: [],
      modalMsg: '',
      emailTouched: false,
      mailtextTouched: false,

    }
  },

  methods: {
    ...mapActions([
      'getUploadFileUrl',
      'apiGetRoles',
      'sendInvitation',
      'apiGetCompanyUsers',
      'apiDeleteCompanyUser',
      'apiGetUser',
      'apiGetCompanyInvitations',
      'apiCancelInvitation',
      'apiUpdateCompanyUser',
    ]),
    openDeleteModal(user) {
      this.userForDelete = user;
      this.$refs.deleteModal.open();
    },
    deleteModalClose() {
      this.userForDelete = false;
      this.$refs.deleteModal.close();
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
    editPerson(user) {
      console.log('edit');
      this.userForUpdate = user;
      this.roles.forEach(item => {
        if (item.value == user.role ) {
          this.newUserRoleUpdate = item;
        }
      });
      this.newJobPosition = user.position;
      if (!this.newUserRoleUpdate) { return false; }
      this.$refs.editModal.open();
    },
    editModalClose() {
      this.$refs.editModal.close();
    },
    deleteUser(userId, reason) {
      // reason = "Not enough hours spent working";
      if (!reason ) { return false; }
      this.deleteModalClose();
      this.preload = true;
      this.apiDeleteCompanyUser({
        userId: userId,
        reason: reason,
        callback: (response) => {
          console.log('apiDeleteCompanyUser', response);
          this.apiGetCompanyUsers({
            companyId: this.companyObj.id,
            callback: (response) => {
              console.log('apiGetCompanyUsers',response);
              if (response.data.statusCode == '200') {
                this.usersList = response.data.body.length ? response.data.body : [];
              }

              let u_i = 0;
              if (!this.usersList.length) {this.preload = false}
              this.usersList.forEach((user, index) => {
                this.apiGetUser({
                  id: user.id,
                  callback: (response) => {
                    if (response.data.statusCode == 200) {
                      let userData = func.formatUserData(response.data.body);
                      this.usersList[index].userObj = userData.userObj;
                      this.usersList[index].userBranding = userData.userBranding;
                    }

                    if (u_i == ( this.usersList.length - 1) ) {
                      this.preload = false;
                    }
                    u_i++;
                  }
                })
              });
            }
          });
        }
      });
    },
    cancelInvitation(confirmationId) {
      this.preload = true;
      this.apiCancelInvitation({
        confirmationId: confirmationId,
        callback: (response) => {
          this.apiGetCompanyInvitations({
            callback: (response) => {
              console.log('apiGetCompanyInvitations', response);
              if (response.data.statusCode == '200' && response.data.body.length) {
                this.invitationsList = response.data.body;
                this.$forceUpdate();
                this.preload = false;
              } else {
                this.invitationsList = [];
                this.$forceUpdate();
                this.preload = false;
              }
            }
          });
        }
      });
    },
    addNewUser() {
      this.newUserForm = true;
    },
    backClick() {
      this.newUserForm = false;
    },
    openUsersModal(msg) {
      this.modalMsg = '';
      msg.forEach(item => {
        this.modalMsg += '<p>'+item+'</p>';
      });
      this.$refs.messageUsersModal.open();
    },
    usersModalClose() {
      this.$refs.messageUsersModal.close();
    },
    successModalClose() {
      this.$refs.successUsersModal.close();
    },
    successModalOpen() {
      this.$refs.successUsersModal.open();
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
    updateUser(user){
      let userId = user.id;
      const errorsArr = [];
      // console.log(userId);
      // return false;
      if (!this.newUserRoleUpdate) {
        errorsArr.push(this.tr('mycomp_role_req'));
      }
      if (!this.newJobPosition.length ) {
        errorsArr.push(this.tr('mycomp_job_position_req'));
      }
      if (this.newJobPosition.length > 30) {
        errorsArr.push(this.tr('mycomp_job_position_max'));
      }
      if (this.newJobPosition.length && /[<>$;.,'\\\/\(\)\{\}]/.test(this.newJobPosition)) {
        errorsArr.push(this.tr('mycomp_job_position_symb'));
      }

      if (errorsArr.length) {
        this.openUsersModal(errorsArr);
        return false;
      }

      let roleId = this.newUserRoleUpdate.value;
      this.editModalClose();
      this.preload = true;
      this.apiUpdateCompanyUser({
        userId: userId,
        roleId: roleId,
        position: this.newJobPosition,
        callback: (response) => {
          user.role = this.newUserRoleUpdate.value;
          user.position = this.newJobPosition;
          this.$forceUpdate();
          this.preload = false;
        }
      });
    },
    send() {
      const errorsArr = [];
      if (!this.email_addresses.length) {
        errorsArr.push(this.tr('mycomp_email_req'));
      } else {
        if (!this.validateEmail(this.email_addresses)) {
          errorsArr.push(this.tr('mycomp_email_invalid'));
        }
      }

      if (!this.mailtext.length) {
        errorsArr.push(this.tr('mycomp_body_text_req'));
      }
      if (!this.newUserRole) {
        errorsArr.push(this.tr('mycomp_role_req'));
      }
      if (!this.jobPosition.length ) {
        errorsArr.push(this.tr('mycomp_job_position_req'));
      }
      if (this.jobPosition.length > 30) {
        errorsArr.push(this.tr('mycomp_job_position_max'));
      }
      if (this.jobPosition.length && /[<>$;.,'\\\/\(\)\{\}]/.test(this.jobPosition)) {
        errorsArr.push(this.tr('mycomp_job_position_symb'));
      }

      if (errorsArr.length) {
        this.openUsersModal(errorsArr);
        return false;
      }

      let email_arr = this.email_addresses.split(',');
      this.preload = true;
      let e_i = 0;
      email_arr.forEach(item => {
        if (!this.sendInvitation({
          type: 'company',
          typeId: this.companyObj.id,
          roleId: this.newUserRole.value,
          email: item.trim(),
          text: this.mailtext.replace(/\n/g, '<br>'),
          position: this.jobPosition,
          callback: (response) => {
            console.log(response);
            if (e_i == (email_arr.length - 1) ) {
              this.email_addresses = '';
              this.mailtext = '';
              this.newUserRole = '';
              this.newUserForm = false;
              this.jobPosition = '';

              this.apiGetCompanyInvitations({
                callback: (response) => {
                  console.log('apiGetCompanyInvitations', response);
                  if (response.data.statusCode == '200' && response.data.body.length) {
                    this.invitationsList = response.data.body;
                  }
                  this.$forceUpdate();
                  this.preload = false;
                  this.successModalOpen();
                }
              });
            }
            e_i++;
          }
        })) console.error("cannot send invitation")
      })

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
    filteredUsersList() {
      let result = this.usersList;
      if (this.search) {
        result = result.filter(item => {
          return (item.name+' '+item.surname).toLowerCase().indexOf(this.search.toLowerCase()) != -1;
        });
      }
      if (this.role && this.role.value) {
        result = result.filter(item => {
          console.log(item.role, this.role);
          return item.role == this.role.value;
        })
      }
      if (this.orderBy.value == 'name') {
        result.sort(function(a, b){
          if(a.name+' '+a.surname < b.name+' '+b.surname) { return -1; }
          if(a.name+' '+a.surname > b.name+' '+b.surname) { return 1; }
          return 0;
        })
      }
      return result;
    }

  }
}
