import Footer from '../../components/Footer/Footer.vue'

import standMixin from '../../mixins/stand.js';
import eventMixin from '../../mixins/event/event.js';

import Messages from './Messages';
import func from '@/others/functions.js';
import datepicker_lang from '@/others/datepicker_lang.js';
import keenui from '@/plugins/keenUi';

const ChatConversations = require('@twilio/conversations');
import { mapActions, mapGetters } from 'vuex'

import { I18n } from 'aws-amplify';
const dict = {
  importLang: (lang) => import( /* webpackChunkName: "chat" */ '@/../locales/chat/'+lang+'.json')
};


let chatChannel;

export default {
  name: 'Chat',
  mixins: [standMixin, eventMixin],
  components: {
    Footer,
    Messages,
  },
  metaInfo() {
    return {
      title: this.localesLoaded ? this.tr('chat') : 'Chat',
      meta: [
        { vmid: 'description', property: 'description', content: this.localesLoaded ? this.tr('chat') : 'Chat' },
        { vmid: 'og:title', property: 'og:title', content: this.localesLoaded ? this.tr('chat') : 'Chat' },
        { vmid: 'og:description', property: 'og:description', content: this.localesLoaded ? this.tr('chat') : 'Chat' },
      ],
    }
  },
  beforeRouteLeave (to, from, next) {
    this.$emit('change-logo', null);
    next();
  },
  mounted() {
    func.setDictionary(dict, () => {
      this.localesLoaded = true;
      this.meetingType = {
        label: this.tr('chat_agenda_zoom_opt'),
        value: 'zoom',
      };
      this.$forceUpdate();
    });
  },
  created() {
    this.timeZoneList = func.getTimezoneList();

    if (this.isLinkedinSignin) {
      this.userData = {
        email: this.$store.state.userData.email,
      }
    } else {
      this.userData = {
        email: this.$Amplify.Auth.user.attributes.email,
      }
    }

    const { presType, presTypeId, id, type, sid } = this.$route.params;
    if (['meeting', 'presenter'].includes(presType) && presTypeId) {
      if (presType === 'meeting') {
        this.getActivityMeeting({
          activityid: presTypeId,
          callback: (response) => {
            if (response.data.statusCode == '200') {
              this.meetingId = response.data.body.id;
              this.getPresenterData(response.data.body.presenter);
            }
          }
        });
      }

      if (presType === 'presenter') {
        this.getPresenterData(presTypeId);
      }
    }

    if (!id || !type) {
      this.getTwilioToken({
        callback: (response) => {
          if (response.data.statusCode == '200' && response.data.body ) {
            this.token = response.data.body,
            this.initializeChat();
          }
        }
      });
    } else {
      if (type === 'stand') {
        this.getFormattedStand(id, () => {
          this.getFormattedEvent(this.standObj.eventId, (response) => {
            if (!sid) {
              if (this.$route.path.split('/').includes('owner')) {
                this.getPersonnel('stand', id, this.standObj.company, (response) => {
                  this.getChats({
                    type: 'stand',
                    id,
                    queryType: 'owner',
                    callback: (resp) => {
                      if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
                        this.chatList = resp.data.body;
                        this.sid = resp.data.body[0].sid;
                        this.active_channel = resp.data.body[0];
                        this.getTwilioToken({
                          callback: (response) => {
                            if (response.data.statusCode == '200' && response.data.body ) {
                              this.token = response.data.body,
                              this.authenticated = true;
                              this.initializeChat();
                              this.$forceUpdate();
                              setInterval(() => {
                                this.renewChatList(true);
                              }, 60000);
                            }
                          }
                        });
                      } else {
                        this.chatListErr = 'Chats not found for this stand..'
                        this.preload = false;
                      }
                    }
                  });
                  this.getPendingChats('stand', id);
                });
              } else {
                this.getChats({
                  type: 'stand',
                  id,
                  queryType: 'visitor',
                  callback: (response) => {
                    let chatArr = [];
                    if (response.data.statusCode == '200' && response.data.body.length) {
                      chatArr = response.data.body.filter(item => {
                        return item.status !== 'closed';
                      });
                    }
                    if (chatArr.length) {
                      this.sid = chatArr[0].sid;
                      this.active_channel = chatArr[0];

                      this.getTwilioToken({
                        callback: (response) => {
                          if (response.data.statusCode == '200' && response.data.body ) {
                            this.token = response.data.body,
                            this.authenticated = true;
                            this.initializeChat();
                          }
                        }
                      });
                    } else {
                      this.preload = false;
                    }
                  }
                });
              }
            } else {
              this.sid = sid;
              this.getTwilioToken({
                callback: (response) => {
                  if (response.data.statusCode == '200' && response.data.body ) {
                    this.token = response.data.body,
                    this.authenticated = true;
                    this.initializeChat();
                  }
                }
              });
            }
          });
        });
      } else if (type === 'event') {
        this.getFormattedEvent(id, (response) => {
          if (!sid) {
            if (this.$route.path.split('/').includes('owner')) {
              this.getPersonnel('event', id, this.eventObj.company, () => {
                this.getChats({
                  type: 'event',
                  id,
                  queryType: 'owner',
                  callback: (resp) => {
                    if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
                      this.chatList = resp.data.body;
                      this.chatList.forEach( (chat, index) => {
                        this.apiGetStand({
                          id: this.chatList[index].standId,
                          callback: (resp) => {
                            if (resp.data.body) {
                              this.chatList[index].stand = resp.data.body;

                              if (resp.data.body.strings.length) {
                                resp.data.body.strings.forEach(str => {
                                  if (str.category == 'name') {
                                    this.chatList[index].stand.name = str.value;
                                    this.$forceUpdate();
                                  }
                                });
                              }
                            }
                          }
                        });
                      });

                      this.sid = resp.data.body[0].sid;
                      this.active_channel = resp.data.body[0];

                      this.getTwilioToken({
                        callback: (response) => {
                          if (response.data.statusCode == '200' && response.data.body ) {
                            this.token = response.data.body,
                            this.authenticated = true;
                            this.initializeChat();
                            this.$forceUpdate();
                            setInterval(() => {
                              this.renewChatList(true);
                            }, 60000);
                          }
                        }
                      });

                    } else {
                      this.chatListErr = 'Chats not found for this event..';
                      this.preload = false;
                    }
                  }
                });
                this.getPendingChats('event', id);
              });

            } else {
              this.getChats({
                type: 'event',
                id,
                queryType: 'visitor',
                callback: (response) => {
                  let chatArr = [];
                  if (response.data.statusCode == '200' && response.data.body.length) {
                    chatArr = response.data.body.filter(item => {
                      return item.status != 'closed';
                    });
                  }
                  if (chatArr.length) {
                    this.sid = chatArr[0].sid;
                    this.active_channel = chatArr[0];

                    this.getTwilioToken({
                      callback: (response) => {
                        if (response.data.statusCode == '200' && response.data.body ) {
                          this.token = response.data.body,
                          this.authenticated = true;
                          this.initializeChat();
                        }
                      }
                    });
                  } else {
                    this.preload = false;
                  }
                }
              });
            }
          } else {
            this.sid = sid;
            this.getTwilioToken({
              callback: (response) => {
                if (response.data.statusCode == '200' && response.data.body ) {
                  this.token = response.data.body,
                  this.authenticated = true;
                  this.initializeChat();
                }
              }
            });
          }
        });
      }
    }
  },
  data: function () {
      return {
        localesLoaded: false,
        authenticated: false,
        messages: [],
        userData: null,
        token: null,
        channels: [],
        sid: null,
        active_channel: null,
        channel_name: '',
        preload: true,
        chatList: [],
        pendingChatList: [],
        chatListErr: '',
        date: {
           dateStart: null,
           timeStart: '',
           dateEnd: null,
           timeEnd: '',
        },

        meetingType: '',
        twitchInput: '',
        twitchMeeting: '',
        twitchPassword: '',
        zoomInput: '',
        zoomMeeting: '',
        zoomPassword: '',
        enableChat: true,
        presenter: '',
        note: '',
        description: '',
        meetingPreload: false,
        datepicker_lang: datepicker_lang,
        timeZoneList: [],
        timezone: '',
        duration: '',
        searchInput: '',
        userList: [],
        formUserList: [],
        rolesList: [],
        anotherOwnerMsg: '',
        meetingId: false,
        presenterData: false,
        showInitializeMessage: false,
        modalMsg: '',
        personnelSearch: '',
        selectedPersonnel: null,
        modalPersonnelFirstStep: true,
        personInfo: '',
        congratulationsText: ''
      }
  },
  methods: {
    ...mapActions([
      'getTwilioToken',
      'createChat',
      'createChatFromStandOwner',
      'getChats',
      'chatAction',
      'apiGetStand',
      'chatAddMeeting',
      'apiGetPersonnel',
      'apiGetRoles',
      'apiGetUser',
      'chatAssignPersonnel',
      'chatUpdateUnreadCount',
      'getActivityMeeting'
    ]),
    getPresenterData(userId) {
      this.apiGetUser({
        id: userId,
        callback: (response) => {
          if (response.data.statusCode == '200') {
            this.presenterData = response.data.body;
          }
        }
      })
    },
    renewChatList(prevActive) {
      this.getChats({
        type: this.$route.params.type,
        id: this.$route.params.id,
        queryType: 'owner',
        callback: (resp) => {
          if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
            this.chatList = resp.data.body.filter(item => {
              return item.status != 'closed';
            });
          }
          if (this.chatList.length) {
            if (this.$route.params.type == 'event') {
              this.chatList.forEach( (chat, index) => {
                this.apiGetStand({
                  id: this.chatList[index].standId,
                  callback: (resp) => {
                    if (resp.data.body) {
                      this.chatList[index].stand = resp.data.body;

                      if (resp.data.body.strings.length) {
                        resp.data.body.strings.forEach(str => {
                          if (str.category == 'name') {
                            this.chatList[index].stand.name = str.value;
                            this.$forceUpdate();
                          }
                        });
                      }
                    }
                  }
                });
              });
            }

            if (!prevActive) {
              this.sid = this.chatList[0].sid;
              this.active_channel = this.chatList[0];
              this.initializeChat();
            }

          } else {
              this.chatList = [];
              this.active_channel = null;
              this.sid = null;
              this.chatListErr = 'Chats not found for this '+this.$route.params.type+'..';
              this.preload = false;
              this.$forceUpdate();
          }
        }
      });
      this.getPendingChats(this.$route.params.type, this.$route.params.id);
    },
    selectPersonnel(user) {
      this.modalPersonnelFirstStep = false;
      this.selectedPersonnel = user;
    },
    assignPersonnel() {
      this.meetingPreload = true;
      this.preload = true;
      this.chatAssignPersonnel({
        sid: this.sid,
        personnelId: this.selectedPersonnel.id,
        callback: (response) => {
          this.renewChatList(false);
          this.personnelModalClose();
          this.successModalOpen(this.tr('chat_assign_congrats_text'));
          this.meetingPreload = false;
        }
      });
    },
    backOnFirstStep() {
      this.selectedPersonnel = null;
      this.modalPersonnelFirstStep = true;
    },
    getRoleById(id) {
      const role = this.rolesList.find(item => item.id === id);
      return role?.name || false;
    },
    setTimezone(timezone) {
      const tz = this.timeZoneList.find(item => item.value === timezone);
      return tz || { value: 2, label: 'GMT +2:00' };
    },
    getPersonnel(type, typeId, companyId, callback) {
      this.apiGetPersonnel({
        type,
        typeId,
        companyId,
        callback: (response) => {
          this.timezone = this.setTimezone(this.eventObj.timezone);
          if (response.data.statusCode == '200') {
            this.userList = response.data.body.length ? response.data.body : [];
            this.apiGetRoles({
              type,
              callback: (response) => {
                if (response.data.statusCode == '200') {
                  this.rolesList = response.data.body;
                  let u_i = 0;
                  if (!this.userList.length && callback) {
                    callback();
                  }

                  this.userList.forEach((user, index) => {
                    const person = user;
                    if ( user.branding && user.branding.length ) {
                      user.branding.forEach(item => {
                        if (!item.strings && !item.strings.length) { return false; }

                        item.strings.forEach(str => {
                          if (str.category == 'description_long' && str.value == 'logo_image') {
                            person.logo = item.url;
                          }
                        });
                      });
                    }

                    this.formUserList.push({
                      label: `${user.name} ${user.surname} - ${user.position}`,
                      value: person
                    });
                  });

                  if (this.formUserList.length) {
                    this.presenter = this.formUserList[0];
                  }
                  
                  callback();

                  // this.userList.forEach((user, index) => {
                  //   this.apiGetUser({
                  //     id: user.personid,
                  //     callback: (response) => {
                  //       if (response.data.statusCode == 200) {
                  //         let userData = func.formatUserData(response.data.body);
                  //         this.userList[index].userObj = userData.userObj;
                  //         this.userList[index].userBranding = userData.userBranding;
                  //       }
                  //       if (u_i == ( this.userList.length - 1) && callback ) {
                  //         callback();
                  //       }
                  //       u_i++;
                  //     }
                  //   })
                  // });
                }

              }
            });
          }
        }
      });
    },
    filterChat() {
      this.$forceUpdate();
    },
    unassignChat() {
      this.preload = true;
      this.chatAction({
        sid: this.sid,
        action: 'deactivate?unassign=true',
        callback: (resp) => {
          this.renewChatList(false);
        }
      });
    },
    deactivateChat() {
      this.preload = true;
      this.chatAction({
        sid: this.sid,
        action: 'deactivate',
        callback: (resp) => {
          this.getChats({
            type: this.$route.params.type,
            id: this.$route.params.id,
            queryType: 'owner',
            callback: (resp) => {
              if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
                this.chatList = resp.data.body.filter(item => {
                  return item.status != 'closed';
                });
              }
              if (this.chatList.length) {
                if (this.$route.params.type == 'event') {
                  this.chatList.forEach( (chat, index) => {
                    this.apiGetStand({
                      id: this.chatList[index].standId,
                      callback: (resp) => {
                        if (resp.data.body) {
                          this.chatList[index].stand = resp.data.body;

                          if (resp.data.body.strings.length) {
                            resp.data.body.strings.forEach(str => {
                              if (str.category == 'name') {
                                this.chatList[index].stand.name = str.value;
                                this.$forceUpdate();
                              }
                            });
                          }
                        }
                      }
                    });
                  });
                }

                this.sid = this.chatList[0].sid;
                this.active_channel = this.chatList[0];
                this.initializeChat();
              } else {
                  this.chatList = [];
                  this.active_channel = null;
                  this.sid = null;
                  this.chatListErr = 'Chats not found for this '+this.$route.params.type+'..';
                  this.preload = false;
                  this.$forceUpdate();
              }
            }
          });
        }
      });
    },
    assignChat(chat, assignIndex) {
      this.preload = true;
      chat.assigning = true;
      this.$forceUpdate();

      this.chatAction({
        sid: chat.sid,
        action: 'assign',
        callback: (resp) => {
          if (resp.data.statusCode) {
            this.getChats({
              type: this.$route.params.type,
              id: this.$route.params.id,
              queryType: 'owner',
              callback: (resp) => {
                if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
                  this.chatList = resp.data.body;

                  this.sid = chat.sid;
                  this.active_channel = null;
                  this.chatList.forEach( (chat, index) => {
                    if (chat.sid == this.sid) {
                      this.active_channel = chat;
                    }
                  });
                  this.initializeChat();

                  if (this.$route.params.type == 'event') {
                    let standIndex = 0;
                    this.pendingChatList.splice(assignIndex, 1);

                    this.chatList.forEach( (chat, index) => {
                      this.apiGetStand({
                        id: this.chatList[index].standId,
                        callback: (resp) => {
                          if (resp.data.body) {
                            this.chatList[index].stand = resp.data.body;

                            if (resp.data.body.strings.length) {
                              resp.data.body.strings.forEach(str => {
                                if (str.category == 'name') {
                                  this.chatList[index].stand.name = str.value;
                                  this.$forceUpdate();
                                }
                              });
                            }

                            if ( standIndex == (this.chatList.length - 1) ) {
                              this.$forceUpdate();
                              this.preload = false;
                            }
                            standIndex++;
                          }
                        }
                      });
                    });
                  } else {
                    this.$forceUpdate();
                    this.pendingChatList.splice(assignIndex, 1);
                    this.preload = false;
                  }
                }
              }
            });
          }
        }
      });
    },
    changeChannel(chat) {
      this.anotherOwnerMsg = '';
      if (this.$route.path.split('/').includes('owner')) {
        const user = this.$route.params.type == 'event' ? this.active_channel.eventUser : this.active_channel.standUser;
        if (user.id !== this.$store.state.userData.id) {
          this.anotherOwnerMsg = `Chat assigned to ${user.name} ${user.surname}`;
          this.joinChatTimeout();
        }

      }
      if (this.sid != chat.sid) {
        this.sid = chat.sid;
        this.active_channel = chat;

        this.channels.forEach(ch => {
          if (ch.sid == this.sid) {
            this.setupChannel(ch);
          }
        });
        this.$forceUpdate();
      }
    },
    getPendingChats(type, id) {
      this.getChats({
        type,
        id,
        queryType: 'pending',
        callback: (resp) => {
          if (resp.data && resp.data.statusCode == '200' && resp.data.body && resp.data.body.length) {
            this.pendingChatList = resp.data.body;
            this.$forceUpdate();
          }
        }
      });
    },
    createNewChat(message) {
      this.showInitializeMessage = true;
      const body = {
        value: message
      };

      if (this.$route.params.presType == 'meeting' && this.$route.params.presTypeId) {
        body.meetingId = this.meetingId;
      }
      if (this.$route.params.presType == 'presenter' && this.$route.params.presTypeId) {
        body.representativeId = this.$route.params.presTypeId;
      }

      let fromStandOwner = false;
      if (this.$route.params.presType == 'stand' && this.$route.params.presTypeId) {
        fromStandOwner = true;
      }

      let createChatCallback = (response) => {
        if (response.data.statusCode == '200' && response.data.body) {

          this.sid = response.data.body.sid;
          this.active_channel = response.data.body;

          this.getTwilioToken({
            callback: (response) => {
              if (response.data.statusCode == '200' && response.data.body) {
                this.token = response.data.body;
                this.authenticated = true;
                this.initializeChat();

              }
            }
          });

        }

      }

      if (fromStandOwner) {
        this.createChatFromStandOwner({
          eventId: this.$route.params.id,
          standId: this.$route.params.presTypeId,
          body: body,
          callback: createChatCallback
        });
      } else {
        this.createChat({
          type: this.$route.params.type,
          id: this.$route.params.id,
          body: body,
          callback: createChatCallback
        });
      }
    },

    async initializeChat() {
      this.anotherOwnerMsg = '';
      if (this.$route.path.split('/').includes('owner')) {
        const user = this.$route.params.type == 'event' ? this.active_channel.eventUser : this.active_channel.standUser;
        if (user?.id !== this.$store.state.userData.id && this.active_channel.standUser?.id !== this.$store.state.userData.id) {
          this.anotherOwnerMsg = `Chat assigned to ${user.name} ${user.surname}`;
          this.joinChatTimeout();
        }
      }
      const client = await ChatConversations.Client.create(this.token);

      setTimeout(() => {
        const conversations = [...client.conversations.conversations]
          .map( ([name, value]) => ({ name, value }) );
        this.channels = conversations.map(conv => {
          return conv.value;
        });

        this.channels.forEach(ch => {
          if (ch.sid == this.sid) {
            this.setupChannel(ch);
          }
        });
      }, 1000);
    },

    setupChannel(channel) {
      // Then join the channel
      if(channel.state && channel.state.status !== "joined") {
        channel.join().then( (channel) => {
            chatChannel = channel; // Set it global
            channel.getMessages().then( messages => {
              this.messages = messages.items;
              this.joinChatTimeout();

              const index = messages.items[messages.items.length - 1].index;
              this.chatUpdateUnreadCount({
                index,
                sid: channel.sid,
                callback: (response) => {
                  if (response.data.statusCode === '200') {
                    this.renewChatList(true);
                  }
                }
              });
            });

            // Listen for new messages sent to the channel
            if (!channel.eventOn) {
              channel.eventOn = true;
              channel.on('messageAdded', (message) => {
                this.messages.push(message.state);
                this.joinChatTimeout();
              });
            }
        }).catch( (err) => {
          console.log(err);
            // If there is error joining the room,
            // get all messages on the channel
            channel.getMessages().then( messages => {
                this.messages = messages.items;
                this.joinChatTimeout();
                this.chatUpdateUnreadCount({
                  index: index,
                  sid: channel.sid,
                  callback: (response) => {
                    console.log(response);
                    if (response.data.statusCode === '200') {
                      console.log('Updated message count using API')
                    }
                  }
                });
            });
        });
      } else {
        chatChannel = channel; // Set it global
        channel.getMessages().then( messages => {
            this.messages = messages.items;
            this.joinChatTimeout();
            const index = messages.items[messages.items.length - 1].index;
            this.chatUpdateUnreadCount({
              index,
              sid: channel.sid,
              callback: (response) => {
                console.log(response);
                if (response.data.statusCode === '200') {
                  console.log('Updated message count using API')
                }
              }
            });
        });

        // Listen for new messages sent to the channel
        if (!channel.eventOn) {
          channel.eventOn = true;
          channel.on('messageAdded', (message) => {
            this.messages.push(message.state);
            this.joinChatTimeout();
          });
        }
      }
    },

    joinChatTimeout() {
      setTimeout(() => {
        this.showInitializeMessage = false;
        this.preload = false;
        document.querySelector('.chat_messages').scrollTop = document.querySelector('.chat_messages').scrollHeight;
      }, 1)
    },

    addMessage(message) {
      if (!this.sid) {
        if (!this.preload) {
          this.preload = true;
          this.createNewChat(message);
        }
      } else {
        if (chatChannel) {
            chatChannel.sendMessage(message);
        }
      }

    },

    showMessages(channel) {
      this.setupChannel(channel)
    },

    getChatAvatar(chat) {
      let branding = chat.eventUser ? chat.standUser.branding : chat.user.branding;

      let avatar = false;
      if (branding) {
        branding.forEach(item => {

          item.strings.forEach(str => {
            if (str.category == 'description_long') {
              if (str.value == 'logo_image') {
                avatar = this.url64(item.url);
              }
            }
          });

          if (item.url.indexOf('logo_image') > -1) {
            avatar = this.url64(item.url);
          }
        });
      }

      return avatar;
    },
    getUserAvatar(chat) {
      const user = chat.eventUser ? chat.standUser : chat.user;
      const branding = user ? user.branding : false;
      if (!branding) return false;

      const logoBranding = branding.find(item => {
        return item.strings?.some(string => string.category === 'description_long' && string.value === 'logo_image') || item.url.indexOf('logo_image') > -1;
      });

      return logoBranding ? this.url64(logoBranding.url) : false;
    },
    openMeetingModal() {
      this.$refs.meetingModal.open();
    },
    meetingModalClose() {
      this.$refs.meetingModal.close();
    },
    openPersonnelModal() {
      this.$refs.personnelModal.open();
    },
    personnelModalClose() {
      this.modalPersonnelFirstStep = true;
      this.selectedPersonnel = null;
      this.personInfo = '';
      this.$refs.personnelModal.close();
    },
    successModalOpen(text) {
      this.congratulationsText = text;
      this.$refs.successModal.open();
    },
    successModalClose() {
      this.$refs.successModal.close();
    },
    blockModalOpen() {
      this.$refs.blockModal.open();
    },
    blockModalClose() {
      this.$refs.blockModal.close();
    },
    reportModalOpen() {
      this.$refs.reportModal.open();
    },
    reportModalClose() {
      this.$refs.reportModal.close();
    },
    errorModalOpen(resp_data) {
      this.modalMsg += '<p>'+resp_data.body+'</p>'
      this.$refs.errorModal.open();
    },
    errorModalClose() {
      this.$refs.errorModal.close();
    },
    setZoomLink(index) {
      if (!index) {
        if (this.zoomMeeting) {
          this.zoomInput = 'https://zoom.us/wc/join/'+this.zoomMeeting+'?prefer=0&pwd='+this.zoomPassword;
        } else {
          this.zoomInput = '';
        }
      }
    },
    setTwitchLink(index) {
      if (!index) {
        if (this.twitchMeeting) {
          this.twitchInput = 'https://player.twitch.tv/?channel='+this.twitchMeeting;
        } else {
          this.twitchInput = '';
        }
      }
    },
    dayListToDatestring(date, time) {
      if (time) {
        date.setUTCHours(time.split(":")[0]);
        date.setMinutes(time.split(":")[1]);
      }

      return date.toISOString()
    },
    addMeeting() {
      const url = this.meetingType == 'zoom' ? this.zoomInput : '';
      if (this.duration && this.date.dateStart && this.date.timeStart ) {
        const start = this.dayListToDatestring(this.date.dateStart, this.date.timeStart.value);

        const dateEnd = new Date(this.date.dateStart.getTime() + this.duration.value*60000);
        const end = this.dayListToDatestring(dateEnd);

        this.meetingPreload = true;
        this.chatAddMeeting({
          sid: this.sid,
          body: {
            url: url || '',
            start: start,
            end: end,
            timezone: this.timezone.value,
            value: {
              meetingUrl: url || '',
              meetingType: this.meetingType ? this.meetingType.value : '',
              enableChat: this.enableChat,
              presenter: this.presenter && this.presenter.value ? {
                name: this.presenter.value.name,
                surname: this.presenter.value.surname,
                id: this.presenter.value.id,
                logo: this.presenter.value.logo,
                position: this.presenter.value.position,
              } : ''
            },
            note: {
              value: this.note,
              userId: this.$store.state.userData.id,
            },
          },
          callback: (response) => {

            this.date = {
               dateStart: null,
               timeStart: '',
               dateEnd: null,
               timeEnd: '',
            };
            this.note = '';
            this.twitchInput = '';
            this.twitchMeeting = '';
            this.twitchPassword = '';
            this.zoomInput = '';
            this.zoomMeeting = '';
            this.zoomPassword = '';
            this.meetingPreload = false;
            this.$refs.meetingModal.close();
            this.duration = '';
            this.meetingType = {
              label: this.tr('chat_agenda_zoom_opt'),
              value: 'zoom',
            };
            this.enableChat = true;
            this.presenter = this.formUserList[0];

            if (response.data.statusCode == '200') {
              this.successModalOpen.open(this.tr('chat_meeting_congrats_text'));
            } else {
              this.errorModalOpen(response.data);
            }
          }
        })
      }
    },
    getTimeAgo(chat) {
      const currentDate = new Date();
      const chatDate = new Date(chat.dateUpdated);
      const diff = currentDate - chatDate;

      const seconds = diff / 1000;
      if (seconds < 60) {
        return 'just now';
      }

      const minutes = seconds / 60;
      if (minutes < 60) {
        return `${Math.ceil(minutes)} mins ago`;
      }

      const hours = minutes / 60;
      if (hours < 24) {
        return `${Math.ceil(hours)} hours ago`;
      }

      const days = hours / 24;
      if (days < 2) {
        return 'Yesterday';
      }

      if (days < 7) {
        return datepicker_lang.days.full[chatDate.getDay()];
      }

      let day = chatDate.getDate();
      let month = chatDate.getMonth();
      const year = chatDate.getFullYear();

      day = day < 10 ? '0'+day : day;
      month = month < 10 ? '0'+month : month;

      return `${day}/${month}/${year}`;
    },
    url64(url) {
      return func.url_64x64('https://'+this.configs.binary+'/'+url);
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes',
      'configs',
      'features',
      'isLinkedinSignin',
      'getLocale'
    ]),
    meetingTypeList() {
      const options = [
        {
          label: this.tr('chat_agenda_zoom_opt'),
          value: 'zoom',
        }
      ];

      if (this.features.video) {
        options.push({
          label: this.tr('chat_agenda_webinar_opt'),
          value: 'webinar',
        });
      }

      return options;
    },
    filteredUserList() {
      return this.personnelSearch
        ? this.userList.filter(user => user.name.toLowerCase().includes(this.personnelSearch.toLowerCase()) || user.position.includes(this.personnelSearch))
        : this.userList;
    },
    timeList() {
      let arr = [];
      for (let i = 0; i < 24; i++) {
        var original_time = i;
        var add = i > 11 ? 'pm' : 'am'
        var time = i > 12 ? i - 12 : i;
        time = time < 10 ? '0'+time : time;
        original_time = original_time < 10 ? original_time : original_time;
        time = time === '00' ? '12' : time;

        arr.push({ label: ''+time+':00 '+add, value: ''+original_time+':00' })
        arr.push({ label: ''+time+':15 '+add, value: ''+original_time+':15' })
        arr.push({ label: ''+time+':30 '+add, value: ''+original_time+':30' })
        arr.push({ label: ''+time+':45 '+add, value: ''+original_time+':45' })
      }

      return arr;
    },
    isOwner() {
      return this.$route.path.split('/').includes('owner');
    },
    checkFields() {
      let url = this.meetingType == 'Zoom' ? this.zoomInput : this.twitchInput;
      return this.date.dateStart && this.date.timeStart && this.duration && this.timezone;
    },
    durationList() {
      let durations = [];

      for(let i = 1; i < 5; i++) {
        durations.push({
          label: i*15+' min',
          value: i*15
        });
      }

      return durations;
    },

    filteredChats() {
      if (!this.chatList.length) return [];
      if (!this.searchInput) return this.chatList;

      let result = [];
      return this.chatList.filter(chat => {
        let user = chat.eventUser ? chat.standUser : chat.user;
        return user.name.toLowerCase().indexOf(this.searchInput.toLowerCase()) != -1 ||
          user.surname.toLowerCase().indexOf(this.searchInput.toLowerCase()) != -1;
      });
    },
    mainInstance() {
      return this.standObj.title ? func.parseStandData(this.standObj) : func.parseEventData(this.eventObj);
    },
  },
  watch: {
    'eventBranding.logo.url': function(newVal, oldVal) {
      if (newVal) {
        this.$emit('change-logo', newVal, 'stand', this.eventObj.id);
      }
    }
  }
}
