import { mapActions, mapGetters } from 'vuex'
import VueUploadComponent from 'vue-upload-component';

export default {
  name: 'Visitors',
  components:{
    'file-upload': VueUploadComponent
  },
  props: {
    eventObj: Object,
    customFields: Array,
    type: String,
    id: Number,
  },
  created() {
    this.status = {label: this.tr('adev_visitors_status_all'), value: 'all'};
    this.getVisitors();
  },
  data: function () {
    return {
      preload: true,
      debouncedSearch: '',
      firstLoad: false,
      currentPage: 1,
      previousPage: 1,
      visitorsList: [],
      status: '',
      fileLink: '',
      modalMsg: '',
      timeout: null,
      importList:[],
      importVisitors_showTooltip: false,
      isLastPage: true,
    }
  },

  methods: {
    ...mapActions([
      'apiGetEventVisitors',
      'apiTicketAction',
      'apiGetVisitorsListLink',
      'apiImportVisitors'
    ]),
    exportVisitors() {
      this.preload = true;
      this.apiGetVisitorsListLink({
        companyId: this.eventObj.company,
        eventId: this.eventObj.id,
        callback: (response) => {
          this.preload = false;
          if (response.data.statusCode == '200' && response.data.body.url) {
            let link = document.getElementById('visitors_download_file_link');
            if (link) {
              link.setAttribute('href', response.data.body.url);
              link.click();
            }
          } else if (response.data.statusCode == '404') {
            this.modalMsg = this.tr('adev_visitors_404_errors');
            this.$refs.messageModal.open();
          } else {
            this.modalMsg = response.data.body;
            this.$refs.messageModal.open();
          }
        }
      });
    },
    selectVisitors() {
      this.$refs.importList.click();
    },
    visitorsPostAction(event) {
      if (event.target.files.length) {
        this.preload = true;

        function throwMessage(v, header, body='', warning=false) {
          let modalMsg = header;
          const errors = body.split(/\r?\n/).filter(el=>!(el.includes('[Invalid]') || el.includes('[Warning]')) && !!el.trim().length)
          if (errors.length) {
            modalMsg += '<ul class="visitors--unordered_list">' + errors.reduce((result, el)=>{
              return `${result} <li class="visitors--unordered_item visitors--unordered_item_${warning?'warning':'error'}">${el}</li>`;
            }, '') + '</ul>';
          }
          v.modalMsg = modalMsg;
          v.$refs.messageModal.open();
        }

       const csvFile = event.target.files[0];
        if (csvFile.size > 102400) {
          throwMessage(this, [this.tr('adev_visitors_import_error_size')]);
        } else {
          this.apiImportVisitors({
            type: this.type,
            id: this.id,
            file: csvFile, 
            callback: (response) => {
              if (response && response.data.statusCode == '200') {
                this.currentPage = 1;
                this.getVisitors();
                const header = `<h3 class="visitors--feature_title">${this.tr('adev_visitors_import_success')}!</h3>`;
                throwMessage(this, header, response.data.body, true);
              } else {
                const header = `<h3 class="visitors--feature_title">${this.tr('adev_visitors_import_errors')}:</h3>`;
                throwMessage(this, header, response.data.body);
              }
              this.preload = false;
            }
          }); 
        }

        event.target.value=null; 
      }
    },
    getVisitors() {
      this.preload = true;
      if (this.currentPage < 1) { this.currentPage = 1 }
      this.apiGetEventVisitors({
        type: this.type,
        id: this.id,
        search: this.search,
        page: this.currentPage - 1,
        recordsPerPage: 11,
        status: this.status && this.status.value && this.status.value != 'all' ? this.status.value : false,
        callback: (response) => {
          this.firstLoad = true;
          if (response.data.statusCode == '200') {
            this.isLastPage = response.data.body.length <= 10;
            this.visitorsList = response.data.body.slice(0, 10);
            if (!this.visitorsList.length && this.currentPage > 1) {
              this.currentPage = this.previousPage;
              this.getVisitors();
            } else {
              this.previousPage = this.currentPage;
            }
          }
          this.preload = false;
        }
      });
    },
    ticketAction(item, action) {
      if (!item || !item.id || !action) { return false; }
      // this.preload = true;

      this.apiTicketAction({
        ticketId: item.id,
        action: action,
        callback: (response) => {
          this.getVisitors();
        }
      });
    },
    changePage(id) {
      this.currentPage = id;
      if (this.currentPage < 1) { this.currentPage = 1 }
      this.getVisitors();
    },
    getFieldName(slug) {
      let result = false;
      this.customFields.forEach(item => {
        if (item.fieldname == slug) {
          result = item.label;
        }
      });

      return result;
    },
    expandItem(item) {
      item.expanded = !item.expanded;
      this.$forceUpdate();
    },
    messageModalClose() {
      this.$refs.messageModal.close();
    }
  },
  computed: {
    ...mapGetters([
      'tr',
      'configs'
    ]),
    statusList() {
      return [
        {label: this.tr('adev_visitors_status_all'), value: 'all'},
        {label: this.tr('adev_visitors_status_banned'), value: 'banned'},
        {label: this.tr('adev_visitors_status_payed'), value: 'payed'},
        {label: this.tr('adev_visitors_status_not_payed'), value: 'not_payed'},
        {label: this.tr('adev_visitors_status_cancelled'), value: 'cancelled'},
        {label: this.tr('adev_visitors_status_refunded'), value: 'refunded'},
      ];
    },
    search: {
      get() {
        return this.debouncedSearch;
      },
      set(val) {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          this.debouncedSearch = val;
          this.getVisitors();
        }, 400)
      }
    },
    importVisitorsTooltip(){
      return `
      <div>
        <h4>${this.tr('adev_visitors_import_tooltip_header')} <u>(${this.tr('adev_visitors_import_tooltip_header_append')})</u>:</h4>
        <ul> 
          <li style="text-align: left">
            <div style="display: flex; flex-direction:row">
              <span style="flex-basis:50%; font-weight: bold">"Customer email"</span> <span style="flex-basis:50%"> - ${this.tr('adev_visitors_import_tooltip_mandatory')}</span>
            </div>
          </li>
          <li style="text-align: left">
            <div style="display: flex; flex-direction:row">
              <span style="flex-basis:50%; font-weight: bold">"Price name"</span> <span style="flex-basis:50%"> - ${this.tr('adev_visitors_import_tooltip_mandatory')}</span>
            </div>
          </li>
          <li style="text-align: left">
            <div style="display: flex; flex-direction:row">
              <span style="flex-basis:50%; font-weight: bold">"Ticket price"</span> <span style="flex-basis:50%"> - ${this.tr('adev_visitors_import_tooltip_zero')}</span>
            </div>
          </li>
          <li style="text-align: left">
            <div style="display: flex; flex-direction:row">
              <span style="flex-basis:50%; font-weight: bold">"Customer name"</span> <span style="flex-basis:50%"> - ${this.tr('adev_visitors_import_tooltip_empty')}</span>
            </div>
          </li>
          <li style="text-align: left">
            <div style="display: flex; flex-direction:row">
              <span style="flex-basis:50%; font-weight: bold">"Purchase date-time"</span> <span style="flex-basis:50%"> - ${this.tr('adev_visitors_import_tooltip_empty')}</span>
            </div>
          </li>
        </ul>
      <div>`
    }
  },
  watch:{
    status: {
      handler() {
        this.currentPage = 1;
        this.previousPage = 1;
      },
      immediate: true
    }
  }
}
