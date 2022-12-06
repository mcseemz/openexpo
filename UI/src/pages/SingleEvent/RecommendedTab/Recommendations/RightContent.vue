<template>
  <div class="right">
    <div v-if="selectedRec.eventInfo">
      <div class="title mb-10">{{selectedRec.title}}</div>
      <div v-if="videoIframeLink" class="video-wrapper mb-16">
        <iframe
          :src="videoIframeLink"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; fullscreen; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen />
      </div>
      <div class="event-activity mb-16" v-if="showEventActivity">
        <div class="title mb-16">{{tr('se_re_event_activity')}}:</div>
        <div class="activities color-s-accent">
          <div class="activity" v-if="agendaLiveCount">
            <div class="count text-big">{{agendaLiveCount}}</div>
            <div class="description text-small">{{tr('se_re_live_streams')}}</div>
          </div>
          <div class="activity" v-if="standsCount">
            <div class="count text-big">{{standsCount}}</div>
            <div class="description text-small">{{tr('se_stands')}}</div>
          </div>
          <div class="activity" v-if="agendaCount">
            <div class="count text-big">{{agendaCount}}</div>
            <div class="description text-small">{{tr('se_re_breakout_sessions')}}</div>
          </div>
        </div>
      </div>
      <div class="our-speakers" v-if="allSpeakers.length">
        <div class="title mb-16">{{tr('se_re_our_speakers')}}:</div>
        <div class="speakers">
          <div class="speaker" v-for="speaker in allSpeakers">
            <img v-if="speaker.logo" class="avatar" :src="speaker.logo" />
            <img v-else class="avatar" src="@/img/default_avatar.svg" />
            <div class="info">
              <div class="name color-s-accent text-small">{{speaker.name}} {{speaker.surname}}</div>
              <div class="position color-grey text-small">{{speaker.position}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- User full info -->
    <div v-if="selectedRec.recType === 'user'">
      <div class="title mb-10">{{tr('se_re_stand_member')}}</div>
      <div class="user-logo flex mb-40" v-if="selectedRec.url">
        <img :src="selectedRec.url" />
      </div>
      <div class="user-name pb-8 mb-16">
        <div class="text-big text-bold color-s-accent">{{selectedRec.name}} {{selectedRec.surname}}</div>
        <div class="social-links">
<!--          /* need to fix it*/-->
          <a class="link big" v-for="link in socialLinksAvailable(selectedRec)" :href="selectedRec.address[link]" target="_blank">
            <img src="../img/facebook.svg" v-if="link === 'facebook'" />
            <img src="../img/twitter.svg" v-if="link === 'twitter'" />
            <img src="../img/linkedin.svg" v-if="link === 'linkedin'" />
            <img src="../img/instagram.svg" v-if="link === 'instagram'" />
          </a>
        </div>
      </div>
      <div class="user-info mb-24">
        <div class="color-grey text-small mb-8">{{tr('se_ra_role')}}: {{selectedRec.position}}</div>
        <div class="user-tags">
          <div class="tag text-tiny color-grey" v-for="tag in selectedRec.tags">{{tag}}</div>
        </div>
      </div>

      <div class="meeting-btn btn mb-16 text-bold" :style="eventBackgroundStyle" @click="openScheduleMeetingModal(selectedRec)">{{tr('se_ra_schedulemeeting')}}</div>
      <div class="start-chat-btn text-bold" :style="eventColorStyle" @click="startChat()">{{tr('se_ra_startchat')}}</div>
    </div>

    <!-- Downloadable full info -->
    <div v-if="selectedRec.recType === 'doc'">
      <div class="title mb-10">{{selectedRec.title}}</div>
      <div class="from-stand" v-if="selectedRec.standName">
        {{tr('by')}}
        <img v-if="selectedRec.standLogo" :src="selectedRec.standLogo">
        {{selectedRec.standName}}
      </div>
      <div class="preview flex mb-16">
        <pdf v-if="selectedRec.fileType === 'PDF'" :src="selectedRec.url" style="max-height: 300px; overflow: auto;"/>
        <img :src="selectedRec.url" v-else-if="['PNG', 'JPG', 'JPEG'].includes(selectedRec.fileType)" />
      </div>
      <div class="doc-name mb-16">
        <div class="doc-icon">
          <img src="../img/file_pdf.svg" v-if="selectedRec.fileType === 'PDF'" />
          <img src="../img/file_image.svg" v-else-if="['PNG', 'JPG', 'JPEG'].includes(selectedRec.fileType)" />
          <img src="../img/file_archive.svg" v-else-if="selectedRec.fileType === 'ZIP'" />
          <img src="../img/file.svg" v-else />
        </div>
        <div class="doc-stat">
          <div>{{selectedRec.name}}</div>
          <div class="text-micro color-grey-40">{{selectedRec.fileType}} - {{fileSize(selectedRec.size)}}</div>
        </div>
      </div>
      <div class="doc-description color-grey mb-32">{{selectedRec.description}}</div>
      <template v-if="noProductRec">
        <a class="meeting-btn btn mb-16 text-bold" :style="eventBackgroundStyle" :href="selectedRec.url">{{tr('se_activity_document_download')}}</a>
        <div class="start-chat-btn text-bold" :style="eventColorStyle" @click="openRDwnlModal()">{{tr('se_ra_viewmore')}}</div>
      </template>
    </div>

    <!-- Stand full info -->
    <div v-if="selectedRec.recType === 'stand'">
      <div class="title mb-10">{{selectedRec.title}}</div>
      <div class="user-logo flex mb-8" v-if="selectedRec.logoUrl">
        <img :src="selectedRec.logoUrl" />
      </div>
                  <div class="text-bold mb-8 color-s-accent">{{selectedRec.name}}</div>
      <div class="mb-24 color-grey">{{selectedRec.description_long || selectedRec.description_short}}</div>
      <div class="staff mb-24" v-if="selectedRec.personnelsList">
        <template v-for="user in selectedRec.personnelsList">
          <img :src="user.logo" v-if="user.logo" />
          <img src="@/img/default_avatar.svg" v-else />
        </template>
      </div>
      <div class="meeting-btn btn mb-16 text-bold" :style="eventBackgroundStyle" @click="viewStand()">{{tr('se_ra_viewstand')}}</div>
                  <div class="start-chat-btn text-bold" :style="eventColorStyle" @click="startStandChat()">{{tr('se_ra_startchatting')}}</div>
    </div>

    <!-- Agenda full info -->
    <div v-if="selectedRec.recType === 'agenda'">
      <div class="title mb-10">{{selectedRec.title}}</div>
      <VideoMeeting ref="videoMeeting" :tiersList="tiersList || []" :mainObj="eventObj" :activity="selectedRec" :compactView="true"></VideoMeeting>
    </div>

    <!-- Article full info -->
    <div v-if="selectedRec.recType === 'news'">
      <div class="title mb-24">{{tr('se_article')}}</div>
      <div class="user-logo flex mb-8">
        <img :src="selectedRec.articleBranding.articleCover.url" />
      </div>
      <div class="mb-12" :style="eventColorStyle">{{selectedRec.title}}</div>
      <div class="mb-40 color-grey">{{selectedRec.articleDescription}}</div>

      <div class="meeting-btn btn mb-16 text-bold" :style="eventBackgroundStyle" @click="goToArticle(selectedRec.id)">{{tr('se_activity_articles_read')}}</div>
    </div>

    <!-- Wheel of fortune -->
    <div v-if="selectedRec.recType === 'lottery'">
      <div class="mb-12">selectedRec.title</div>
      <div class="from-stand" v-if="eventSponsors[selectedRec.items[0]].sponsorData.title">
        {{tr('vm_sponsored_by')}}
        <img v-if="sponsorLogo(selectedRec.items[0])" :src="sponsorLogo(selectedRec.items[0])">
        {{eventSponsors[selectedRec.items[0]].sponsorData.title}}
      </div>
      <div class="wof" v-if="selectedRec.sponsor && selectedRec.sponsor.id">
        <div class="left">
          <canvas :id="'canvas_'+selectedRec.sponsor.id" width='200' height='200'>
            Canvas not supported, use another browser.
          </canvas>
        </div>
        <div class="right">
          <h3 class="title">{{selectedRec.sponsor.parameter.lottery.name}}</h3>

          <p class="text">{{selectedRec.sponsor.parameter.lottery.description}}</p>
          <div class="button_box">
            <button class="btn btn_orange text-bold" v-if="!mapWheels[selectedRec.items[0]].hideSpinBtn && !mapWheels[selectedRec.items[0]].waitForNext" @click="spinLottery(selectedRec.sponsor.id)">{{tr('se_activity_wof_button_text')}}</button>
            <button class="btn btn_orange disabled text-bold" v-if="mapWheels[selectedRec.items[0]].hideSpinBtn || mapWheels[selectedRec.items[0]].waitForNext">{{tr('se_activity_wof_button_text')}}</button>

            <p class="button_text" v-if="mapWheels[selectedRec.items[0]].waitForNext">{{tr('se_activity_wof_wait_next')}}</p>
            <p class="button_text" v-if="mapWheels[selectedRec.items[0]].hideSpinBtn && !mapWheels[selectedRec.items[0]].waitForNext">{{tr('se_activity_wof_already_win')}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import {mapGetters, mapState} from "vuex";

export default {
  name: "RightContent",
  props:['mapWheels','selectedRec','videoIframeLink','showEventActivity','agendaLiveCount','standsCount','agendaCount','allSpeakers','socialLinksAvailable','eventBackgroundStyle','eventColorStyle','noProductRec','eventObj','eventObj'],
  methods:{
    viewStand() {
      this.$router.push(`/${this.routes.stand}/${this.selectedRec.id}`);
    },
    openScheduleMeetingModal(item) {
      // this.scheduleMeetingPerson = item;
      this.$emit('changescheduleMeetingPerson',item)
    },
    openRDwnlModal() {
      this.$refs.recDownloadablesModal.open();
    },
    startChat() {
      this.$router.push(`/${this.routes.chat}/${this.routes.event}/${this.eventObj.id}/presenter/${this.selectedRec.id}`);
    },
    goToArticle(id) {
      this.$router.push(`/${this.routes.article}/${id}`);
    },
    spinLottery(sponsorId) {
      if (this.mapWheels[sponsorId]) {
        this.mapWheels[sponsorId].startAnimation();
        this.mapWheels['rec_'+sponsorId].startAnimation();
      }
    },
    fileSize(size) {
      size = size / 1000;
      let measure = 'KB';

      if (size > 1000) {
        size = size / 1000;
        measure = 'MB'
      }

      size = Math.ceil(size);

      return `${size}${measure}`;
    },
    startStandChat() {
      this.$router.push(`/${this.routes.chat}/${this.routes.stand}/${this.selectedRec.id}`);
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs',
      'routes'
    ]),
    ...mapState([
      'userData',
    ]),
  }
}

</script>

<style scoped>

</style>
