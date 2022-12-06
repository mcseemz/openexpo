import func from '@/others/functions.js';
import { mapActions, mapGetters } from 'vuex'

import BarChart from '@/components/BarChart/BarChart.vue';

export default {
  name: 'SponsorsReport',
  props: {
    eventObj: Object,
  },
  components: {
    BarChart
  },
  created() {
    this.getTiersList();
  },
  data: function () {
    return {
      sponsorsList: [],
      preload: true,
      chartsReady: false,
      charts: {

      },
      placeIdList: [],
      filesList: {
        lottery: [],
        survey: [],
      },
      chartdata: {
        labels: ['November', 'December', 'January'],
        datasets: [
          {
            label: 'Sponsor 1 - Views',
            backgroundColor: '#f87979',
            data: [30, 20, 40],
            stack: 1,
          },
          {
            label: 'Sponsor 2 - Views',
            backgroundColor: '#f8f879',
            data: [10, 40, 10],
            stack: 1,
          },
          {
            label: 'Sponsor 1 - Actions',
            backgroundColor: '#78f879',
            data: [10, 40, 10],
            stack: 2,
          },
          {
            label: 'Sponsor 2 - Actions',
            backgroundColor: '#78f8f8',
            data: [10, 40, 10],
            stack: 2,
          }
        ]
      },
      options: {
        scales: {
            xAxes: [{
                stacked: true
            }],
            yAxes: [{
                stacked: true
            }]
        },
      }
    }
  },

  methods: {
    ...mapActions([
      'apiGetTiers',
      'apiGetSignedReportUrl'
    ]),
    getFileData(json) {
      console.log('JSON',json);
      return 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, 0, 4));
    },
    parseChartsData() {
      console.log(this.sponsorsList, 'this.sponsorsList');
      this.sponsorsList.forEach(sponsor => {
        sponsor.reportData.forEach(report => {
          if (!this.charts[report.place_id]) {
            this.charts[report.place_id] = {
              reports: {
                view: {
                  title: report.place_id,
                  datesList: [],
                  labels: [],
                  datasets: [],
                  reportsList: {},
                },
                action: {
                  title: report.place_id,
                  datesList: [],
                  labels: [],
                  datasets: [],
                  reportsList: {},
                }
              }
            }
          }

          if (report.place_id == 'lottery') {
            console.log("report.place_id == 'lottery'", sponsor);
            this.charts[report.place_id].reports.lottery = sponsor.reportData;
          }
          if (report.place_id == 'survey') {
            this.charts[report.place_id].reports.survey = sponsor.reportData;
          }

          const date = new Date(report.date);
          let date_exist = false;

          if (!this.placeIdList.includes(report.place_id)) {
            this.placeIdList.push(report.place_id);
          }

          const action_type = report.action_type == 'action' || report.action_type == 'click' ? 'action' : 'view';

          if (!this.charts[report.place_id].reports[action_type].reportsList[sponsor.sponsorObj.id]) {
            this.charts[report.place_id].reports[action_type].reportsList[sponsor.sponsorObj.id] = {
              name: sponsor.sponsorObj.companyname ? sponsor.sponsorObj.companyname : sponsor.sponsorObj.username,
              data: [],
            }
          }

          this.charts[report.place_id].reports[action_type].reportsList[sponsor.sponsorObj.id].data.push(report);


          this.charts[report.place_id].reports[action_type].datesList.forEach(item => {
            if (item.getTime() === date.getTime()) {
              date_exist = true;
            }
          });
          if (!date_exist) {
            this.charts[report.place_id].reports[action_type].datesList.push(date)
          }

          this.charts[report.place_id].reports[action_type].datesList = this.charts[report.place_id].reports[action_type].datesList.sort((a, b) => {
            return a.getTime() - b.getTime();
          })

        })
      });
      
      Object.keys(this.charts).forEach(chart => {
        this.formatChartDateList(this.charts[chart].reports['view']);
        this.formatChartDateList(this.charts[chart].reports['action']);
      })

      Object.keys(this.charts).forEach(chart => {

        this.charts[chart].reports['view'].labels.forEach(label => {
          Object.keys(this.charts[chart].reports['view'].reportsList).forEach(sponsor_id => {
            console.log('VIEW', this.charts[chart].reports['view'], sponsor_id)
            if (this.charts[chart].reports['view'].reportsList[sponsor_id].data.length) {
              let thisDateExist = false;
              this.charts[chart].reports['view'].reportsList[sponsor_id].data.forEach(rep => {
                if (rep.date && rep.date.length) {
                  if (!this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates) {
                    this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates = [];
                  }
                  
                  if (rep.date.split(' ')[0] == label) {
                    this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates.push(+rep.total);
                    thisDateExist = true;
                  }
                }
              })
              if (!thisDateExist && this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates) {
                this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates.push(0);
              }
            }
          })
        })

        this.charts[chart].reports['action'].labels.forEach(label => {
          Object.keys(this.charts[chart].reports['action'].reportsList).forEach(sponsor_id => {
            if (this.charts[chart].reports['action'].reportsList[sponsor_id].data.length) {
              let thisDateExist = false;
              this.charts[chart].reports['action'].reportsList[sponsor_id].data.forEach(rep => {
                if (rep.date && rep.date.length) {
                  if (!this.charts[chart].reports['action'].reportsList[sponsor_id].action_all_dates) {
                    this.charts[chart].reports['action'].reportsList[sponsor_id].action_all_dates = [];
                  }

                  if (rep.date.split(' ')[0] == label) {
                    this.charts[chart].reports['action'].reportsList[sponsor_id].action_all_dates.push(+rep.total);
                    thisDateExist = true;
                  }
                }  
              })
              if (!thisDateExist && this.charts[chart].reports['action'].reportsList[sponsor_id].action_all_dates) {
                this.charts[chart].reports['action'].reportsList[sponsor_id].action_all_dates.push(0);
              }
            }
          })  
        });
        
      })

      Object.keys(this.charts).forEach(chart => {
        Object.keys(this.charts[chart].reports.view.reportsList).forEach(sponsor_id => {

          if (this.charts[chart].reports['view'].reportsList[sponsor_id] && this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates) {
            this.charts[chart].reports['view'].datasets.push({
              label: this.charts[chart].reports['view'].reportsList[sponsor_id].name,
              backgroundColor: '#'+Math.floor(Math.random()*16777215).toString(16),
              data: this.charts[chart].reports['view'].reportsList[sponsor_id].view_all_dates,
              stack: 1,
            })
          }
        })

        Object.keys(this.charts[chart].reports.action.reportsList).forEach(sponsor_id => {
          if (this.charts[chart].reports['action'].reportsList[sponsor_id] && this.charts[chart].reports['action'].reportsList[sponsor_id].action_all_dates) {
            this.charts[chart].reports['action'].datasets.push({
              label: this.charts[chart].reports['action'].reportsList[sponsor_id].name,
              backgroundColor: '#'+Math.floor(Math.random()*16777215).toString(16),
              data: this.charts[chart].reports.action.reportsList[sponsor_id].action_all_dates,
              stack: 1,
            })
            console.log('CHART OF ACT', this.charts[chart]);  
          }
          console.log('CHART OF CHART', this.charts[chart]);
          // this.charts[chart].reports[sponsor_id]
        })
      });

      this.chartsReady = true;
      console.log(this.charts); 
      this.$forceUpdate();
    },

    formatChartDateList(reports) {
      reports.datesList.forEach(item => {
        const year = item.getFullYear();
        const month = (item.getMonth()+1) < 10 ? '0'+(item.getMonth()+1) : (item.getMonth()+1);
        const day = item.getDate() < 10 ? '0'+item.getDate() : item.getDate();
        reports.labels.push(`${year}-${month}-${day}`);
      });
    },
    getTiersList() {
      this.apiGetTiers({
        eventId: this.eventObj.id,
        callback: (response) => {
          let totalSponsorsCount = 0;
          response.data.body.forEach((item, index) => {
            totalSponsorsCount += item.sponsors.length;
          });

          let s_index = 1;

          response.data.body.forEach((item, index) => {

            item.sponsors.forEach((sponsor) => {

              const queries = [false, false, false];

              this.apiGetSignedReportUrl({
                eventCompanyId: this.eventObj.company,
                eventId: this.eventObj.id,
                objectRef: sponsor.object_ref,
                objectRefId: sponsor.object_ref_id,
                callback: (response) => {
                  console.log('apiGetSignedReportUrl1', response.data);
                  let reportData = [{"date":"2020-11-14 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"1"},
                    {"date":"2020-11-16 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"3"},
                    {"date":"2020-11-19 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"4"},
                    {"date":"2020-11-17 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"2"},
                    {"date":"2020-11-14 00:00:00.000000000","place_id":"event-landing","action_type":"action","total":"1"},
                    {"date":"2020-11-16 00:00:00.000000000","place_id":"event-landing","action_type":"action","total":"2"},
                    {"date":"2020-11-19 00:00:00.000000000","place_id":"event-landing","action_type":"action","total":"3"},
                    {"date":"2020-11-17 00:00:00.000000000","place_id":"event-landing","action_type":"action","total":"4"}];
                  let reportData2 = [{"date":"2020-11-14 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"1"},
                    {"date":"2020-11-16 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"3"},
                    {"date":"2020-11-18 00:00:00.000000000","place_id":"event-landing","action_type":"view","total":"4"}];
                  if (!response.data.statusCode) {
                    this.sponsorsList.push({
                      sponsorObj: sponsor,
                      reportData: response.data,
                      // reportData: (s_index == 1 ? reportData : reportData2)
                    })
                  }

                  queries[0] = true;
                  if (!queries.includes(false)) {
                    if (s_index == totalSponsorsCount) {
                      this.parseChartsData();
                    }
                    s_index++;
                  }
                  
                }
              });


              this.apiGetSignedReportUrl({
                eventCompanyId: this.eventObj.company,
                eventId: this.eventObj.id,
                objectRef: sponsor.object_ref,
                objectRefId: sponsor.object_ref_id,
                type: 'survey',
                callback: (response) => {
                  console.log('apiGetSignedReportUrl2', response.data);

                  if (!response.data.statusCode) {
                    this.sponsorsList.push({
                      sponsorObj: sponsor,
                      reportData: response.data,
                    })
                    this.filesList.survey.push({
                      sponsorName: sponsor.object_ref == 'company' ? sponsor.companyname : sponsor.username,
                      file: response.data
                    });
                  }

                  queries[1] = true;
                  if (!queries.includes(false)) {
                    if (s_index == totalSponsorsCount) {
                      this.parseChartsData();
                    }
                    s_index++;
                  }
                  
                }
              });

              this.apiGetSignedReportUrl({
                eventCompanyId: this.eventObj.company,
                eventId: this.eventObj.id,
                objectRef: sponsor.object_ref,
                objectRefId: sponsor.object_ref_id,
                type: 'lottery',
                callback: (response) => {
                  console.log('apiGetSignedReportUrl3', response.data);

                  if (!response.data.statusCode) {
                    this.sponsorsList.push({
                      sponsorObj: sponsor,
                      reportData: response.data,
                    })
                    this.filesList.lottery.push({
                      sponsorName: sponsor.object_ref == 'company' ? sponsor.companyname : sponsor.username,
                      file: response.data
                    });
                  }

                  queries[2] = true;
                  if (!queries.includes(false)) {
                    if (s_index == totalSponsorsCount) {
                      this.parseChartsData();
                    }
                    s_index++;
                  }
                  
                }
              });

            })

          });

          this.preload = false;
          console.log(this.sponsorsList);

          
        }
      })
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs'
    ]),
    
  }
}
