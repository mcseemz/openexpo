import VueUploadComponent from 'vue-upload-component';

import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'Downloadables',
  props: {
    downloadables: Object,
    companyObj: Object
  },
  components: {
    VueUploadComponent

  },
  data: function () {
    return {
      // files: [],
      test: '',
      fileNameInpt: '',
      fileDescInpt: '',
      fileInput: [],
      existChanger: true,
    }
  },

  methods: {
    ...mapActions([
      // 'updateEvent',
      'getUploadFileUrl',
      'uploadFiles',
      'getDownloadFileUrl',
     
      // 'apiGetEvent'
    ]),
    customAction() {
      console.log('customAction');
      console.log(this.downloadables.new);
    },
    updatetValue(value) {
      this.downloadables.new = value
      console.log(this.downloadables.new);
    },
    removeFile(file) {
      // this.$refs.upload.remove(file);
      this.downloadables.new.splice(file, 1);
    },
    removeExistFile(id) {
      delete this.downloadables.exist[id];
      this.downloadables.maps[id] = false;
      console.log('removeExistFile downloadables - ',this.downloadables);
      this.existChanger = false;
      this.existChanger = true;
    },
    /**
     * Has changed
     * @param  Object|undefined   newFile   Read only
     * @param  Object|undefined   oldFile   Read only
     * @return undefined
     */
    inputFile: function (newFile, oldFile) {
      // this.files.push(newFile);
      if (newFile && oldFile && !newFile.active && oldFile.active) {
        // Get response data
        console.log('response', newFile.response)
        if (newFile.xhr) {
          //  Get the response status code
          console.log('status', newFile.xhr.status)
        }
      }
    },

    getFileType(file_name) {
      let arr = file_name.split('.');
      return arr[arr.length - 1];
    },

    addFile() {
      if (this.fileDescInpt.length > 400 || this.fileNameInpt.length > 200) {
        return false;
      }
      console.log(this.fileInput);

      if (this.fileInput.length ) {
        this.fileInput[0].fileName = this.fileInput[0].name;
        this.fileInput[0].fileTitle = this.fileNameInpt;
        this.fileInput[0].fileDesc = this.fileDescInpt;
        this.downloadables.new.push(this.fileInput[0]);  
        this.fileInput = [];
        this.fileNameInpt = this.fileDescInpt = '';
      }
      
    },

    pipiu() {
      let that = this;

      this.uploadFiles({
        id: this.standObj.id, 
        files: this.downloadables.files,

        callback(resp) {
          that.test = resp; 
          console.log('resp', that.test);
        }
      });
      // this.getUploadFileUrl({
      //   id: this.standObj.id, 

      //   callback(resp) {
      //     that.test = resp; 
      //     console.log('resp', that.test);
      //   }

      // });
    }

    // inputFilter: function (newFile, oldFile, prevent) {
    //   if (newFile && !oldFile) {
    //     // Filter non-image file
    //     if (!/\.(jpeg|jpe|jpg|gif|png|webp)$/i.test(newFile.name)) {
    //       return prevent()
    //     }
    //   }

    //   // Create a blob field
    //   newFile.blob = ''
    //   let URL = window.URL || window.webkitURL
    //   if (URL && URL.createObjectURL) {
    //     newFile.blob = URL.createObjectURL(newFile.file)
    //   }
    // }
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    fileTitle() {
      return this.fileInput && this.fileInput.length ? this.fileInput[0].name : this.tr('mycomp_dwnl_file_title_text');
    },
    fileSubtitle() {
      return this.fileInput && this.fileInput.length ? this.getFileType(this.fileInput[0].name) + ' - ' + Math.round((this.fileInput[0].size/1024)) + 'KB' : this.tr('mycomp_dwnl_file_subtitle_text');
    }
  }
}
