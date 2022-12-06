
<template>


  <div class="left">
              <template v-if="selectedFilter === 'All recommendations'">
                <div class="title">{{tr('se_re_recommendations')}}</div>
                <div class="rec-item" @click="selectRec(eventRec)" :class="{'selected': selectedRec.eventInfo}">
                  <div class="description">
                    <div :style="eventColorStyle" class="video-title">{{getPromoTitle}}</div>
                  </div>
                  <div class="banner filled" v-if="videoIframeLink">
                    <iframe
                      :src="videoIframeLink"
                      frameborder="0"
                      width="160"
                      height="100"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                </div>
              </template>
              <div v-for="rec in filteredRecs" class="rec-item" @click="selectRec(rec)" :class="{'selected': selectedRec == rec}" >
                <div class="description flex-column">
                  <div :style="eventColorStyle" class="mb-8 flex aic">
                    <div>{{rec.title}}</div>
                    <div class="ml-8" v-if="rec.recType === 'agenda'">
                      <img src="../img/info.svg" />
                      <ui-tooltip position="top">{{tr('vm_presenter_title')}}: {{rec.presenter.name}} {{rec.presenter.surname}}</ui-tooltip>
                    </div>
                  </div>
                  <!-- User -->
                  <div v-if="rec.recType === 'user'" class="user-info text-small color-s-accent">
                    <div class="user-role mb-4">{{tr('se_ra_role')}}: {{rec.position}}</div>
                    <div class="presenting-at">
                      {{tr('se_ra_presentingat')}}:
                      <img v-if="rec.stand.templateCoverUrl" :src="rec.stand.templateCoverUrl">
                      {{rec.stand.name}}
                    </div>
                    <div class="social-links" v-if="socialLinksAvailable(rec).length">
                      <a class="link" v-for="link in socialLinksAvailable(rec)" :href="rec.address[link]" target="_blank">
                        <img src="../img/facebook.svg" v-if="link === 'facebook'" />
                        <img src="../img/twitter.svg" v-if="link === 'twitter'" />
                        <img src="../img/linkedin.svg" v-if="link === 'linkedin'" />
                        <img src="../img/instagram.svg" v-if="link === 'instagram'" />
                      </a>
                    </div>
                  </div>

                  <!-- Downloadable -->
                  <div v-if="rec.recType === 'doc'" class="doc-info text-small color-s-accent mt-4">
                    <div class="doc-name mb-8">
                      <div class="doc-icon">
                        <img src="../img/file_pdf.svg" v-if="rec.fileType === 'PDF'" />
                        <img src="../img/file_image.svg" v-else-if="['PNG', 'JPG', 'JPEG'].includes(rec.fileType)" />
                        <img src="../img/file_archive.svg" v-else-if="rec.fileType === 'ZIP'" />
                        <img src="../img/file.svg" v-else />
                      </div>
                      <div class="doc-stat">
                        <div>{{rec.name}}</div>
                        <div class="text-micro color-grey-40" v-if="rec.size">{{rec.fileType}} - {{fileSize(rec.size)}}</div>
                      </div>
                    </div>
                    <div class="presenting-at" v-if="rec.standName">
                      {{tr('search_from')}}:
                      <img v-if="rec.standLogo" :src="rec.standLogo">
                      {{rec.standName}}
                    </div>
                  </div>

                  <!-- Stand -->
                  <div v-if="rec.recType === 'stand'" class="stand-info text-small color-s-accent mt-4" >

                    <div class="mb-8">{{rec.description_short}}</div>
                    <div class="staff" v-if="rec.logoUrl">
<!--                        <img :src="rec.logoUrl" v-if="rec.logoUrl" />-->
                    </div>
                  </div>

                  <!-- Agenda -->
                  <div v-if="rec.recType === 'agenda'" class="agenda-info text-small color-s-accent">
                    <div class="text-micro color-black mb-8">{{getAgendaTime(rec)}} {{eventObj.timezoneObj.abbr}}</div>
                    <div class="staff" v-if="rec.attendees">
                      <template v-for="user in rec.attendees">
                        <img :src="user.url" v-if="user.url" />
                        <img src="@/img/default_avatar.svg" v-else />
                      </template>
                    </div>
                  </div>




                </div>
                 <!-- in left side right banner-->
                <div class="banner" :class="{'grey-back': (rec.url && rec.fileType !== 'PDF') || rec.recType === 'agenda'}">
                  <img class="tv-img" :src="rec.thumbnail" v-if="rec.recType === 'agenda'"/>
                  <img :src="rec.url" v-else-if="rec.url && rec.fileType !== 'PDF'" />
                  <img :src="rec.baner_image" v-if="rec.baner_image && rec.recType === 'stand'" />
                </div>


              </div>
    <!--                       activites not connected         -->
              <div v-for="rec in activities" class="rec-item" @click="selectRec(rec)" :class="{'selected': selectedRec == rec}" v-if="selectedFilter === 'All recommendations'">
                <div class="description flex-column">
                  <div :style="eventColorStyle" class="mb-8">{{rec.title}}</div>

                  <!-- Article -->
                  <div class="text-micro color-black" v-if="rec.recType === 'news'">{{tr('se_re_posted')}}: {{getArticleDate(rec.publishDate)}}</div>

                  <!-- Wheel -->
                  <div class="text-small color-s-accent" v-if="rec.recType === 'lottery'">
                    <div v-if="eventSponsors[rec.items[0]].sponsorData.title" class="presenting-at">
                      {{tr('vm_sponsored_by')}}
                      <img v-if="sponsorLogo(rec.items[0])" :src="sponsorLogo(rec.items[0])">
                      {{eventSponsors[rec.items[0]].sponsorData.title}}
                    </div>
                  </div>
                </div>

                <div class="banner">
                  <img :src="rec.articleBranding.articleBanner.url" v-if="rec.recType === 'news'" />
                </div>
              </div>

            </div>

</template>

<script>
import helper from '@/others/functions.js';
import {mapActions, mapGetters, mapState} from "vuex";
export default {
  name: "LeftContent",
  data: () => {
    return {
      filterOptions: [
        'All recommendations',
        'All Video Streams',
        'Stands',
        'All speakers',
        'All staff'
      ],
      selectedFilter: 'All recommendations',
      selectedRec: null,
      eventRec: null,
      preload: false,
      eventSponsors: {},
      eventDownloadablesList: [],
      wofCount: 0,
      scheduleMeetingPerson: {},
      mapWheels: {},
      winningSegment: false,
      banner: {},
      curRecList: []
    }
  },
  props: {
    eventObj: Object,
    eventBranding: Object,
    evtItemDate: Object,
    agenda: Object,
    standsList: Array,
    sponsorsList: Array,
    tiersList : Array,
    downloadables: Object,
    recommendedList: Array,
    filteredRecs: Array,
    activities: Array
  },
  created() {
    const eventRec = {
      title: this.getPromoTitle,
      eventInfo: true
    };
    this.eventRec = eventRec;
    this.selectRec(eventRec);
  },
  mounted() {
    this.preload = true;
    this.tiersList.forEach(tier => {
      tier.sponsors.forEach(sponsor => {
        this.eventSponsors[sponsor.relation_id] = sponsor;
      });
    });
    const tmpRecList = [];
    const dwnlKeys = Object.keys(this.downloadables.exist);
    if (dwnlKeys.length) {
      dwnlKeys.forEach(key => {
        this.eventDownloadablesList.push(this.downloadables.exist[key]);
      })
      this.eventDownloadablesList.forEach(item => {
        const extension = item.fileType.split('/')[1];
        const title = item.tags?.indexOf('type:product') > -1
          ? this.tr(`ct_tn_product_${this.eventObj.theme}`)
          : this.tr('se_ra_featureddownloadable');
        tmpRecList.push({
          ...item,
          recType: 'doc',
          title,
          fileType: extension.toUpperCase(),
          url: item.thumbnail,
        });
      });
    }
    if (this.standsList.length && this.userData) {
      this.standsList.forEach(item => {
        let stand = item;
        stand.recType = 'stand';
        stand.recTags = [];
        if (stand.tags && stand.tags.length) {
          stand.tags.forEach(tag => {
            if (tag.split(':')[0] == 'tag') {
              stand.recTags.push(tag.split(':')[1]);
            }
          });
        }
        // getting downloadables from stand
        stand.standMaterials.forEach(doc => {
          const description = doc.strings.find(item => item.category === 'description_long');
          const name = doc.strings.find(item => item.category === 'name');
          const extension = doc.filetype?.split('/')[1];
          doc.url = helper.url_560x315('https://'+this.configs.binary+'/'+doc.url);
          tmpRecList.push({
            ...doc,
            recType: 'doc',
            name: name ? name.value : 'Document',
            title: doc.tags?.indexOf('type:product') > -1 ? 'Product' : this.tr('se_ra_featureddownloadable'),
            description: description.value || '',
            standName: stand.name,
            // standLogo: stand.templateCoverUrl,
            fileType: extension ? extension.toUpperCase() : '',
            url: doc.thumbnail,
          });
        });
        if (this.eventObj.letmein) {
          this.apiGetStandAvaliablePersonnel({
            id: stand.id,
            callback: (response) => {
              this.apiGetCompany({
                id: stand.company,
                callback: (resp) => {
                  if (resp.data.statusCode == 200) {
                    stand.recCompany = resp.data.body;
                    stand.title = this.tr('se_ra_featuredstand');
                    const banner = stand.branding.find(item => item.description === 'banner_image');
                    if (banner && banner.url) {
                      stand.url = helper.url_560x315('https://'+this.configs.binary+'/'+banner.url);
                    } else {
                      stand.url = stand.templateBannerUrl;
                    }
                    tmpRecList.push(stand);
                  }
                  if (response.data.statusCode == '200' && response.data.body.length) {
                    stand.personnelsList = response.data.body;
                    stand.personnelsList.forEach(item => {
                      if (item.branding && item.branding.length) {
                        const image = item.branding.find(brand => brand.description === 'logo_image' || brand.url.indexOf('logo_image'));
                        if (image) {
                          item.url = helper.url_560x315('https://'+this.configs.binary+'/'+image.url);
                          item.logo = helper.url_64x64('https://'+this.configs.binary+'/'+image.url);
                        }
                      }
                      tmpRecList.push({
                        ...item,
                        stand,
                        recType: 'user',
                        title: `${item.name} ${item.surname}`
                      });
                    });
                    // this.recommendedList = [...tmpRecList];
                  }
                }
              })
            }
          });
        }
      });
    }
    if (this.agenda.sessions.length) {
      this.agenda.sessions.forEach(item => {
        const dateEnd = new Date(item.dateEnd);
        if (item.meetingType !== 'no_video' && dateEnd > new Date()) {
          item.attendees.forEach(user => {
            user.url = user.logo ? helper.url_64x64('https://'+this.configs.binary+'/'+user.logo) : null;
          });
          item.branding.forEach(brand => {
            if (brand.url.indexOf('activity_thumb')>-1) {
              item.thumbnail = helper.url_368x208('https://'+this.configs.binary+'/'+brand.url);
            }
          });
          tmpRecList.push({
            ...item,
            recType: 'agenda',
            descriptionShort: item.description.length > 63 ? item.description.substr(0, 60)+'...' : item.description,
            title: item.sessionTitle
          });
        }
      });
    }
    if (tmpRecList.length) {
      // this.recommendedList = [...tmpRecList];
    }
    this.preload = false;
    window.alertPrizeGlobal = this.alertPrize;
    this.addRecList()
    this.recommendedList.map(item => {
      if(item.branding && item.recType === 'stand') {
        this.banner = item.branding.find(elem => elem.url.includes('d-banner_image'))
        if(this.banner?.url) {
          let itemUrl302x211 = helper.url_302x211('https://'+this.configs.binary +'/'+this.banner.url);
          item.baner_image = itemUrl302x211
        }
      }
      return item
    })


  },
  methods: {
    ...mapActions([
      'apiGetStandAvaliablePersonnel',
      'apiGetCompany',
      'apiGetArticleById',
      'apiGetLotteryData',
      'apiGetSurveyData',
      'apiGetUser',
      'apiPutLotteryData',
    ]),
    addRecList() {
      if(!this.recommendedList.find(item => item.recType == 'agenda') && this.agenda.sessions) {
        this.curRecList = this.recommendedList
        this.agenda.sessions.map(item => this.curRecList.push(item))
        this.$store.commit('changeRecommenderList',this.curRecList)
      }
      if(!this.recommendedList.find(item => item.recType == 'stand' && this.standsList)) {
        this.curRecList = this.recommendedList
        this.standsList.map(item => this.curRecList.push(item))
        this.$store.commit('changeRecommenderList',this.curRecList)
      }
    },
    selectRec(rec) {
      this.selectedRec = rec;
      this.$emit('passSelRec',rec)
    },
    getAdditionalActivityData(activityArr) {
      const arr = [];
      activityArr.forEach((item, index) => {
        if (item.type === 'news') {
          item.items.forEach((id, i) => {
            this.apiGetArticleById({
              id,
              callback: (response) => {
                if (response.data.statusCode == 200 && response.data.body) {
                  const article = helper.getArticlesData(response.data.body);
                  arr.push({
                    ...article,
                    recType: 'news',
                    title: article.articleTitle
                  })
                }
              }
            })
          });
        } else if (item.type === 'lottery') {
          this.wofCount++;
          if (item.items[0]) {
            if (this.eventObj.letmein) {
              this.apiGetLotteryData({
                id: item.items[0],
                callback: (response) => {
                  this.wofCount--;
                  if (response.data.statusCode == '200') {
                    item.sponsor = {
                      id: item.items[0],
                      enabled: response.data.body.enabled,
                      parameter: {
                        lottery: response.data.body
                      }
                    };
                    if (item.sponsor.enabled && response.data.body.last) {
                      let nextDate = new Date(response.data.body.last);
                      nextDate.setHours(nextDate.getHours() + 1);
                      let nowDate = new Date();
                      if (nowDate < nextDate) {
                        item.sponsor.waitForNext = true;
                      }
                    }
                    this.getSponsorDataForItem(item.items[0]);
                    this.wheels.push(item.sponsor);
                    item.recType = 'lottery';
                    this.recommendedList.unshift(item);
                    this.wheelOfFortuneInit(item.sponsor);
                    arr.push({
                      ...item,
                      title: this.tr('se_tiers_wheel_of_fortune')
                    });
                  }
                  if (!this.wofCount) {
                    this.recommendedList = helper.arrayShuffle(this.recommendedList);
                    this.wofLoaded = true;
                  }
                }
              });
            }
          }
        }
      });
      if (!this.wofCount) {
        this.wofLoaded = true;
      }
      this.activities = arr;
    },
    getSponsorDataForItem(id) {
      const eventSponsor = this.eventSponsors[id];
      if (eventSponsor && !eventSponsor.sponsorData) {
        if (eventSponsor.object_ref == 'company') {
          this.apiGetCompany({
            id: eventSponsor.object_ref_id,
            callback: (resp) => {
              eventSponsor.sponsorData = {
                title: resp.data.body.name
              };
              if (resp.data.body.branding.length) {
                eventSponsor.sponsorData.logo = helper.url_40x40('https://'+this.configs.binary+'/'+resp.data.body.branding[0].url);
              }
            }
          })
        } else {
          this.apiGetUser({
            id: eventSponsor.object_ref_id,
            callback: (resp) => {
              eventSponsor.sponsorData = {
                title: `${resp.data.body.name} ${resp.data.body.surname}`
              };
              if (resp.data.body.branding.length) {
                eventSponsor.sponsorData.logo = helper.url_40x40('https://'+this.configs.binary+'/'+resp.data.body.branding[0].url);
              }
            }
          })
        }
      }
    },
    socialLinksAvailable(user) {
      if (!user.address) return [];
      const socialKeys = ['facebook', 'twitter', 'linkedin', 'instagram'];
      return socialKeys.filter(key => user.address[key]);
    },
    startChat() {
      this.$router.push(`/${this.routes.chat}/${this.routes.event}/${this.eventObj.id}/presenter/${this.selectedRec.id}`);
    },
    startStandChat() {
      this.$router.push(`/${this.routes.chat}/${this.routes.stand}/${this.selectedRec.id}`);
    },
    viewStand() {
      this.$router.push(`/${this.routes.stand}/${this.selectedRec.id}`);
    },
    openScheduleMeetingModal(item) {
      this.$emit('changescheduleMeetingPerson',item)
      // if (this.$refs.staffScheduleMeeting) {
      //   this.$refs.staffScheduleMeeting.openModal(this.scheduleMeetingPerson);
      // }
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
    openRDwnlModal() {
      this.$refs.recDownloadablesModal.open();
    },
    closeRDwnlModal() {
      this.$refs.recDownloadablesModal.close();
    },
    getAgendaTime(agenda) {
      console.log(agenda,'haskaci xndir@')
      const timeStart = this.getFormattedTime(agenda.dateStart);
      const timeEnd = this.getFormattedTime(agenda.dateEnd);
      const dateStart = new Date(agenda.dateStart);
      const dateEnd = new Date(agenda.dateEnd);
      const dayStart = dateStart.getUTCDate();
      const dayEnd = dateEnd.getUTCDate();
      // const monthStart = datepicker_lang.months.abbreviated[dateStart.getUTCMonth()];
      // const monthEnd = datepicker_lang.months.abbreviated[dateEnd.getUTCMonth()];
      if (dayStart !== dayEnd) {
        return `${dayStart}  ${timeStart} - ${dayEnd}  ${timeEnd}`;
      }
      return `${dayStart} ${timeStart} - ${timeEnd}`;
    },
    getFormattedTime(dateString) {
      const date = new Date(dateString);
      const tzValue = this.eventObj.timezoneObj.value;
      let hours = date.getUTCHours() + parseInt(tzValue);
      hours = hours < 10 ? '0'+hours : hours;
      let minutes = date.getUTCMinutes() < 10 ? '0'+date.getUTCMinutes() : date.getUTCMinutes();
      return `${hours}:${minutes}`;
    },
    getArticleDate(dateString) {
      const date = new Date(dateString);
      // const month = datepicker_lang.months.abbreviated[date.getUTCMonth()];
      const day = date.getUTCDate();
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    },
    goToArticle(id) {
      this.$router.push(`/${this.routes.article}/${id}`);
    },
    wheelOfFortuneInit(sponsor) {
      let segments = [];
      let isWhite = false;
      sponsor.parameter.lottery.options.forEach(opt => {
        if (opt.amount != '0') {
          segments.push({
            'text': opt.label,
            'id': opt.id,
            'sponsorId': sponsor.id,
          });
          isWhite = !isWhite;
        }
      })
      let chance = +sponsor.parameter.lottery.chance;
      let itemChance = chance / segments.length;
      let looseCount = (100 - chance) / itemChance;
      for (let i = 0; i < looseCount; i++) {
        segments.push({
          'text': 'Nothing',
          'id': false,
          'sponsorId': sponsor.id,
        });
        isWhite = !isWhite;
      }
      segments = helper.arrayShuffle(segments);
      segments.forEach(item => {
        item.fillStyle = isWhite ? '#ECF4FA' : '#140C35',
          item.textFillStyle = isWhite ? '#140C35' : '#FFF',
          isWhite = !isWhite;
      })
      this.mapWheels[sponsor.id] = new Winwheel({
        'hideSpinBtn': !sponsor.enabled,
        'waitForNext': sponsor.waitForNext,
        'canvasId': 'canvas_'+sponsor.id,
        'numSegments'  : 8,         // Number of segments
        'outerRadius'  : 161,       // The size of the wheel.
        'innerRadius'  : 18,
        'centerX'      : 170,       // Used to position on the background correctly.
        'centerY'      : 170,
        'textFontSize' : 14,        // Font size.
        'textFontWeight': 'normal',
        'fillStyle'    : '#E5843D',
        'lineWidth'    : 0.01,
        'segments'     : segments,         // Definition of all the segments.
        'animation' :               // Definition of the animation
          {
            'type'     : 'spinToStop',
            'duration' : 5,
            'spins'    : 1,
            'callbackFinished' : 'alertPrizeGlobal('+sponsor.id+')'
          }
      });
      this.mapWheels['rec_'+sponsor.id] = new Winwheel({
        'hideSpinBtn': !sponsor.enabled,
        'waitForNext': sponsor.waitForNext,
        'canvasId': 'carousel_canvas_'+sponsor.id,
        'numSegments'  : 8,         // Number of segments
        'outerRadius'  : 87,       // The size of the wheel.
        'innerRadius'  : 10,
        'centerX'      : 95,       // Used to position on the background correctly.
        'centerY'      : 95,
        'textFontSize' : 10,        // Font size.
        'textFontWeight': 500,
        'fillStyle'    : '#E5843D',
        'lineWidth'    : 0.01,
        'segments'     : segments,         // Definition of all the segments.
        'animation' :               // Definition of the animation
          {
            'type'     : 'spinToStop',
            'duration' : 5,
            'spins'    : 1,
            'callbackFinished' : 'alertPrizeGlobal('+sponsor.id+')'
          }
      });
    },
    alertPrize(id) {
      this.winningSegment = false;
      const winningSegment = this.mapWheels[id].getIndicatedSegment();
      const prizeId = winningSegment.id || null;
      this.apiPutLotteryData({
        id: winningSegment.sponsorId,
        prizeId,
        callback: (response) => {
          if (!prizeId) {
            this.mapWheels[id].waitForNext = true;
            this.mapWheels['rec_'+id].waitForNext = true;
          }
          this.winningSegment = winningSegment;
          this.successModalOpen(id);
        }
      })
    },
    successModalOpen(id) {
      this.mapWheels[id].hideSpinBtn = true;
      this.mapWheels['rec_'+id].waitForNext = true;
      this.$refs.successModal.open();
    },
    successModalClose() {
      this.$refs.successModal.close();
    },
    sponsorLogo(id) {
      return this.eventSponsors[id]?.sponsorData?.logo || null;
    },
    spinLottery(sponsorId) {
      if (this.mapWheels[sponsorId]) {
        this.mapWheels[sponsorId].startAnimation();
        this.mapWheels['rec_'+sponsorId].startAnimation();
      }
    },
    filterChange(value) {
      if (value === 'All recommendations') {
        this.selectedRec = this.eventRec;
      } else if (this.filteredRecs.length) {
        this.selectedRec = this.filteredRecs[0]
      } else {
        this.selectedRec = {};
      }
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
    videoIframeLink() {
      if (!this.eventObj.video) { return false; }
      if (this.eventObj.video.includes('youtu.be')) {
        this.eventObj.video = this.eventObj.video.replace('youtu.be/', 'www.youtube.com/watch?v=');
      }
      if (this.eventObj.video.includes('youtube.com')) {
        return 'https://www.youtube.com/embed/'+this.eventObj.video.split('?v=')[1];
      }
      if (this.eventObj.video.includes('vimeo.com')) {
        return 'https://player.vimeo.com/video/'+this.eventObj.video.split('com/')[1];
      }
      return false;
    },
    eventColorStyle() {
      return `color: ${this.eventObj.color || '#E5843D'}`
    },
    eventBackgroundStyle() {
      return `background: ${this.eventObj.color || '#E5843D'}`
    },
    getPromoTitle() {
      if (this.videoIframeLink) {
        return this.eventObj.videoname || 'Intro video';
      } else {
        return 'Event information'
      }
    },
    allSpeakers() {
      return this.recommendedList.filter(item => item.recType === 'user' && item.role === 20);
    },
    standsCount() {
      return this.standsList.length;
    },
    agendaCount() {
      return this.agenda.sessions.filter(item => item.meetingType === 'no_video').length;
    },
    agendaLiveCount() {
      return this.agenda.sessions.filter(item => item.meetingType !== 'no_video').length;
    },
    showEventActivity() {
      return this.agendaLiveCount || this.standsCount || this.agendaCount;
    },
    // filteredRecs() {
    //   switch (this.selectedFilter) {
    //     case 'All recommendations':
    //     return this.recommendedList;
    //     case 'All Video Streams':
    //     return this.recommendedList.filter(item => item.recType === 'agenda' && item.meetingType !== 'no_video')
    //     case 'Stands':
    //     return this.recommendedList.filter(item => item.recType === 'stand')
    //     case 'All speakers':
    //       return this.allSpeakers
    //     case 'All staff':
    //     // return this.recommendedList.filter(item => item.recType === 'user' && item.role !== 20);
    //   }
    // },
    noProductRec() {
      return !this.selectedRec.tags?.includes('type:product');
    },
    filteredDownloadables() {
      let downloadables = this.eventDownloadablesList.filter(item => !item.tags?.includes('type:product'));
      if (downloadables.length > 4) {
        downloadables = downloadables.slice(-4)
      }
      return downloadables;
    },
  }
}
</script>


