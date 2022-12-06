<template>
      <div class="chat_main_content flex">
        <div class="chat_main_top flex">
          <div class="left flex">
            <span><button class="btn btn_white" v-if="isOwner && active_channel && !preload" @click="openPersonnelModal">{{tr('chat_assign_personnel_button')}}</button><ui-tooltip>{{ tr('chat_assign_tooltip') }}</ui-tooltip></span>
            <!-- <button class="btn" v-if="isOwner && active_channel && !preload" @click="addMeeting">{{tr('chat_add_meeting')}}</button> -->
          </div>
          <div class="right flex">
            <div class="icon-wrapper" v-if="false">
              <img src="./img/searchNew.svg" />
            </div>
            <div class="icon-wrapper" v-if="isOwner && active_channel && !preload" @click="addMeeting">
              <img src="./img/calendarNew.svg" />
            </div>
            <div class="icon-wrapper" v-if="false">
              <img src="./img/attachNew.svg" />
            </div>
            <div class="icon-wrapper">
              <img src="./img/menuNew.svg" />

              <ui-popover ref="popover" class="menu-popover" position="bottom-end" @click="">
                <p class="menu-item" v-if="isOwner && active_channel && !preload" @click="deactivateChat">{{tr('chat_archive')}}</p>
                <p class="menu-item" @click="openBlockModal">{{tr('chat_block')}}</p>
                <p class="menu-item" @click="openReportModal">{{tr('chat_report')}}</p>
              </ui-popover>
            </div>
            <!-- <span><button class="btn btn_white" @click="unassignChat" v-if="isOwner && active_channel && !preload">{{tr('chat_unassign_chat')}}</button><ui-tooltip>{{ tr('chat_unassign_tooltip') }}</ui-tooltip></span>
            <span><button class="btn btn_white" @click="deactivateChat" v-if="isOwner && active_channel && !preload">{{tr('chat_deactivate_chat')}}</button><ui-tooltip>{{ tr('chat_deactivate_tooltip') }}</ui-tooltip></span> -->
          </div>
        </div>
        <div class="chat_main_bottom flex">
          <div class="chat_messages_wrapper">
            <div class="preloader_overlay preload_overlay_white preload_overlay_msg" v-show="preload">
              <ui-progress-circular color="primary" ></ui-progress-circular>
              <p class="text" v-if="showInitializeMessage">
                {{tr('chat_init_message')}}
              </p>
            </div>
            <div class="another_person_msg" v-if="anotherOwnerMsg">
              <p>{{anotherOwnerMsg}}</p>
            </div>
            <div class="chat_messages">

              <div class="chat_row chat_row_empty" v-if="!messages.length">
                {{tr('chat_empty_message')}}
              </div>
              <div class="chat_row"
                :class="[(message.author == userData.email) ? 'me' : '']"
                :key="message.id"
                v-if="active_channel && !preload"
                v-for="message in messages"
              >
                <div v-if="message.author != userData.email && getUserAvatar(active_channel) && !preload" class="img_box">
                  <img :src="getUserAvatar(active_channel)" alt="">
                </div>
                <div v-if="message.author != userData.email && !getUserAvatar(active_channel) && !preload" class="img_box">
                  <img src="@/img/default_avatar.svg" alt="">
                </div>
                <div class="text_box">
                  <p class="text small_text">{{ message.body }}</p>
                  <div class="time">{{messageTime(message.timestamp || message.state.timestamp)}}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="chat_write_message_box">
            <input
              type="text"
              class="new_message"
              v-model="message"
              :placeholder="tr('vm_message_ph')"
              @keyup.enter="addMessage"
            >
            <button class="send_new_message" @click="addMessage"><img src="./img/sendMessageNew.svg"></button>
          </div>
        </div>
      </div>

</template>

<script>
  import func from '@/others/functions.js';
  import { mapActions, mapGetters } from 'vuex'

   export default {
       props: {
           messages: Array,
           userData: Object,
           preload: Boolean,
           isOwner: Boolean,
           active_channel: Object,
           anotherOwnerMsg: String,
           showInitializeMessage: Boolean,
       },
       data() {
           return {
               message: ""
           }
       },
       methods: {
          addMessage() {
            const message = this.message.trim();
            if (message) {
              this.$emit('new-message', message);
              console.log(message);
              this.message = "";
            }
          },
          deactivateChat() {
            this.$refs.popover.close();
            this.$emit('deactivate-chat');
          },
          unassignChat() {
            this.$emit('unassign-chat');
          },
          addMeeting() {
            this.$emit('add-meeting');
            console.log('Messages -> addMeeting');
          },
          openPersonnelModal() {
            this.$emit('open-personnel');
            console.log('Messages -> openPersonnelModal');
          },
          openBlockModal() {
            this.$refs.popover.close();
            this.$emit('open-block');
          },
          openReportModal() {
            this.$refs.popover.close();
            this.$emit('open-report');
          },
          messageTime(datestring) {
            const date = new Date(datestring);

            let hrs = date.getHours();
            let min = date.getMinutes();

            hrs = hrs < 10 ? '0'+hrs : hrs;
            min = min < 10 ? '0'+min : min;

            return hrs+':'+min;
          },
          getUserAvatar(chat) {
            if (!chat) {
              return false;
            }
            let branding = false;
            if (this.isOwner) {
              let user = chat.eventUser  ? chat.standUser : chat.user;
              branding = user ? user.branding : false;
            } else {
              let user = chat.eventUser  ? chat.eventUser : chat.standUser;
              branding = user ? user.branding : false;
            }

            let avatar = false;
            if (branding) {

              branding.forEach(item => {
                item.strings.forEach(str => {
                  if (str.category == 'description_long') {
                    if (str.value == 'logo_image') {
                      avatar = func.url_64x64('https://'+this.configs.binary+'/'+item.url);
                    }
                  }
                });

                if (item.url.indexOf('logo_image') > -1) {
                  avatar = func.url_64x64('https://'+this.configs.binary+'/'+item.url);
                }
              });
            }
            return avatar;
          },
       },
       computed: {
        ...mapGetters([
          'configs',
          'tr'
        ]),
      }
   };
</script>

<style src="./Messages.scss" scoped lang="scss"></style>
