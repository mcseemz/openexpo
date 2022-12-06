import pdf from 'vue-pdf';
import { mapGetters, mapActions, mapState } from 'vuex';
import helper from '@/others/functions.js';
import datepicker_lang from '@/others/datepicker_lang.js';
import StaffScheduleMeeting from '@/components/StaffScheduleMeeting/StaffScheduleMeeting.vue';
import VideoMeeting from '@/components/VideoMeeting/VideoMeeting.vue';


export default {
  name: 'RecommendedTab',
  components: {
    StaffScheduleMeeting,
    VideoMeeting,
    pdf,
  },
  data: () => {
    return {
      filterOptions: [
        'All recommendations',
        'All Video Streams',
        'Stands',
        'All speakers',
        'All staff',
      ],
      selectedFilter: 'All recommendations',
      selectedRec: null,
      eventRec: null,
      preload: false,
      eventSponsors: {},
      eventDownloadablesList: [],
      wofCount: 0,
      recommendedList: [],
      scheduleMeetingPerson: {},
      activities: [],
      mapWheels: {},
      winningSegment: false,
      isFoxAvailable: false,
      banner: {},
      filteredSponsorsList: [],
      sponsorTags: [],
    }
  },
  props: {
    eventObj: Object,
    eventBranding: Object,
    evtItemDate: Object,
    agenda: Object,
    standsList: Array,
    sponsorsList: Array,
    tiersList: Array,
    downloadables: Object
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
          fileType: extension,
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
            standLogo: stand.templateCoverUrl,
            fileType: extension ? extension : '',
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
                    this.recommendedList = [...tmpRecList];
                    this.recommendedList = this.recommendedList.filter( item => !item.TypeSponsor);
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
      this.recommendedList = [...tmpRecList];
    }

    this.preload = false;
    window.alertPrizeGlobal = this.alertPrize;

    this.addRecList();

   this.recommendedList.map(item => {
      if(item.branding && item.recType === 'stand') {
        this.banner = item.branding.find(elem => elem.url.includes('d-banner_image'))
        if(this.banner?.url) {
          let itemUrl302x211 = helper.url_302x211('https://'+this.configs.binary +'/'+this.banner.url);
          item.banner_image = itemUrl302x211;
        }
      }

      return item
    })
    this.recommendedList = this.recommendedList.filter(item => {

      if (item.tags && !item.tags.includes('type:sponsor')) {
        return item.tags;
      } else {
        this.filteredSponsorsList.push(item);
      }

    });

    this.sponsorTags = [];

    this.eventDownloadablesList.forEach( list => list.tags.forEach(tag => {
      if(tag !== 'type:sponsor' && list.TypeSponsor) {
        this.sponsorTags.push({tag:tag,sponsorLink:list.filmLink,images:[{url:list.url}] }) }
    }))

    const array = this.sponsorTags.reduce((result, currentValue) => {
      (result[currentValue.tag] = result[currentValue.tag] || []).push(
        ...currentValue.images,
        currentValue.sponsorLink,
      );
      return result;
    }, {});
    this.sponsorTags = [];

    Object.keys(array).map( item => {
      const obj = {
        tag: '',
        sponsorLink: '',
        images: []
      }
      obj.tag = item;
      obj.sponsorLink = array[item][1];
      array[item].map((img)=>{
        obj.images.push(img);
      })
      if(obj.tag != 'type:product') this.sponsorTags.push(obj);
    })

    this.sponsorTags.sort((a, b) => a.tag.localeCompare(b.tag));
    this.recommendedList = [...this.recommendedList, ...this.filteredSponsorsList];
  },
  methods: {
    ...mapActions([
      'apiGetActivity',
      'apiGetStandAvaliablePersonnel',
      'apiGetCompany',
      'apiGetArticleById',
      'apiGetLotteryData',
      'apiGetSurveyData',
      'apiGetUser',
      'apiPutLotteryData',
    ]),
    openLink(url) {
      if(url == undefined) return false;
      let routeData = this.$router.resolve({name: url});
      let newUrl;
      if(routeData.route.name.includes("https://")) {
         newUrl = routeData.route.name
      } else newUrl = "https://" + routeData.route.name
        window.open(newUrl, '_blank');
    },
    addRecList() {
      if(!this.recommendedList.find(item => item.recType == 'agenda') && this.agenda.sessions) {
        this.agenda.sessions.map(item => this.recommendedList.push(item))
      }
      if(!this.recommendedList.find(item => item.recType == 'stand' && this.standsList)) {
        this.standsList.map(item => this.recommendedList.push(item))
      }
    },
    selectRec(rec) {
      this.selectedRec = rec;
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
      this.scheduleMeetingPerson = item;

      if (this.$refs.staffScheduleMeeting) {
        this.$refs.staffScheduleMeeting.openModal(this.scheduleMeetingPerson);
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
    openRDwnlModal() {
      this.$refs.recDownloadablesModal.open();
    },
    closeRDwnlModal() {
      this.$refs.recDownloadablesModal.close();
    },
    getAgendaTime(agenda) {
      const timeStart = this.getFormattedTime(agenda.dateStart);
      const timeEnd = this.getFormattedTime(agenda.dateEnd);

      const dateStart = new Date(agenda.dateStart);
      const dateEnd = new Date(agenda.dateEnd);

      const dayStart = dateStart.getUTCDate();
      const dayEnd = dateEnd.getUTCDate();
      const monthStart = datepicker_lang.months.abbreviated[dateStart.getUTCMonth()];
      const monthEnd = datepicker_lang.months.abbreviated[dateEnd.getUTCMonth()];

      if (dayStart !== dayEnd) {
        return `${dayStart} ${monthStart} ${timeStart} - ${dayEnd} ${monthEnd} ${timeEnd}`;
      }

      return `${dayStart} ${monthStart} ${timeStart} - ${timeEnd}`;
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
      const month = datepicker_lang.months.abbreviated[date.getUTCMonth()];
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
    filteredRecs() {
      switch (this.selectedFilter) {
        case 'All recommendations':
          return this.recommendedList;
        case 'All Video Streams':
          return this.recommendedList.filter(item => item.recType === 'agenda' && item.meetingType !== 'no_video')
        case 'Stands':
          return this.recommendedList.filter(item => item.recType === 'stand')
        case 'All speakers':
          return this.allSpeakers
        case 'All staff':
          return this.recommendedList.filter(item => item.recType === 'user' && item.role !== 20);
      }
    },
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
