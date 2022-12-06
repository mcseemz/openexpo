import keenui from '@/plugins/keenUi';

import { mapActions } from 'vuex'

export default {
  name: 'TestApi',
  components: {

  },
  data: function () {
    return {
      url: '',
      bodyVal: '',
    }
  },

  methods: {

    ...mapActions([
      'testGet',
      'testPost',
      'testPut',
      'testDelete',
    ]),

    send() {
      this.testGet(this.url).then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.log(error);
        });

      
    },
    post() {

      this.testPost({
        url: this.url, 
        body: this.bodyVal,
      }).then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.log(error);
        });     
    },
    put() {
      this.testPut({
        url: this.url, 
        body: this.bodyVal,
      }).then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.log(error);
        });     
    },
    sendDelete() {
      this.testDelete(this.url).then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.log(error);
        });     
    },

  },
}
