import Vue from 'vue';
import store from '@/store';
import axios from 'axios';
import {Auth} from 'aws-amplify'
import config from '@/../configs';
import {utc} from 'moment';
import router from '@/router'
const apiUrl = config ? config.api : null;
import * as AWS from 'amazon-cognito-identity-js';
import func from '@/others/functions.js';

axios.interceptors.response.use((response) => {

  const setError = response.data && response.data.statusCode
    ? !(response.data.statusCode < 400
      || (response.config.errorsPass && response.config.errorsPass.length && response.config.errorsPass.includes(response.data.statusCode)))
    : true
  if (setError && !response.config.passAllErrors) {
    store.commit('setApiError', {
      errorMsg: response.data,
      url: response.config.url,
      method: response.config.method,
    });
  }

  return response;

}, (error) => {
  Promise.reject(error);
});

let reauthRunned = false;

export default {

  actions: {
    async reauth(context, callback) {
      console.log('REAUTH');
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        const currentSession = await Auth.currentSession();
        cognitoUser.refreshSession(currentSession.refreshToken, (err, session) => {
          console.log('session', err, session);
          const {idToken, refreshToken, accessToken} = session;

          if (context.rootState.user) {
            context.rootState.user.signInUserSession = session;
            console.log('REAUTH CALLBACK', session);

            setTimeout(() => {
              reauthRunned = false;
            }, 5000);
            if (!reauthRunned) {
              callback();
              reauthRunned = true;
            }
          }
          console.log(context.rootState);
          // do whatever you want to do now :)
        });
      } catch (e) {
        console.log('Unable to refresh Token', e);
      }
    },
    async getApi(context, data) {
      if (!data.url) {
        return false;
      }

      let token = null;
      let user = this.getters.getUser;

      if (this.getters.isLinkedinSignin) {
        token = localStorage.getItem('id_token');
        console.log('expires_at', localStorage.getItem('expires_at'), new Date())

      } else {
        if (!user) {
          user = this.getters.getAuthUser;
        }

        if (!user) {
          user = await Auth.currentAuthenticatedUser();
        }

        if (user) {
          token = user.signInUserSession.idToken.jwtToken;
        }
      }

      let locale = context.rootState.i18n.locale;
      let answer = '';

      if (token) {
        return await axios
          .get(data.url, {
            headers: {
              'Authorization': 'Bearer ' + token,
              'language': locale
            },
            errorsPass: data.errorsPass ? data.errorsPass : [],
            passAllErrors: data.passAllErrors ? true : false
          })
          .then(response => answer = response)
          .catch(error => {
            this.dispatch('reauth', () => {
              this.dispatch('getApi', data);
            });
            answer = error;

          });
      }

    },
    async getUApi(context, data) {
      if (!data.url) {
        return false;
      }

      let locale = context.rootState.i18n.locale;
      let answer = '';

      return await axios
        .get(data.url, {
          headers: {
            'language': locale
          },
          errorsPass: data.errorsPass || [],
          passAllErrors: !!data.passAllErrors
        });
    },
    async deleteApi(context, data) {
      if (!data.url) {
        return false;
      }

      let token = null;
      let user = this.getters.getUser;

      if (this.getters.isLinkedinSignin) {
        token = localStorage.getItem('id_token');

      } else {
        if (!user) {
          user = this.getters.getAuthUser;
        }

        if (!user) {
          user = await Auth.currentAuthenticatedUser();
        }

        if (user) {
          token = user.signInUserSession.idToken.jwtToken;
        }
      }

      let answer = '';
      let locale = context.rootState.i18n.locale;

      if (token) {
        return await axios
          .delete(data.url, {
            headers: {
              'Authorization': 'Bearer ' + token,
              'language': locale
            },
            errorsPass: data.errorsPass ? data.errorsPass : [],
            passAllErrors: data.passAllErrors ? true : false
          })

          .then(response => answer = response)
          .catch(error => {
            this.dispatch('reauth', () => {
              this.dispatch('deleteApi', data);
            });
            answer = error;

          });
      }

    },
    async postApi(context, data = {}, plaintext = false) {
      if (!data.url || !data.body) {
        return false
      }

      const body = data.body;

      let token = null;
      let user = this.getters.getUser;

      if (this.getters.isLinkedinSignin) {
        token = localStorage.getItem('id_token');

      } else {
        if (!user) {
          user = this.getters.getAuthUser;
        }

        if (!user) {
          user = await Auth.currentAuthenticatedUser();
        }

        if (user) {
          token = user.signInUserSession.idToken.jwtToken;
        }
      }

      let locale = context.rootState.i18n.locale;
      if (token) {
        let headers = {
          'Authorization': 'Bearer ' + token,
          'language': locale,

        };
        if (plaintext) {
          headers['Content-Type'] = 'text/plain';
        }
        if (data.contenttype) {
          headers['Content-Type'] = data.contenttype;
        }
        return await axios
          .post(data.url, data.body,
            {
              headers: headers,
              errorsPass: data.errorsPass ? data.errorsPass : [],
              passAllErrors: data.passAllErrors ? true : false
            },
          )
          .then((response) => {
            if (data.callback) {
              data.callback(response);
            } else {
              return response;
            }
          })
          .catch(error => {
            this.dispatch('reauth', () => {
              this.dispatch('postApi', data);
            });
          });
      }

    },

    async postUApi(context, data = {}, plaintext = false) {
      if (!data.url || !data.body) {
        return false
      }

      const body = data.body;

      let locale = context.rootState.i18n.locale;

      let headers = {
        'language': locale,
      };
      if (plaintext) {
        headers['Content-Type'] = 'text/plain';
      }
      return await axios
        .post(data.url, data.body,
          {
            headers: headers,
            errorsPass: data.errorsPass ? data.errorsPass : [],
            passAllErrors: data.passAllErrors ? true : false
          },
        )
        .then((response) => {
          if (data.callback) {
            data.callback(response);
          }
        })
        .catch(error => {
          console.log(error);
        });


    },

    async postFileApi(context, data = {}) {
      if (!data.url || !data.body) {
        return false
      }

      const body = data.body;

      let user = this.getters.getUser;
      if (!user) {
        user = this.getters.getAuthUser
      }

      let locale = context.rootState.i18n.locale;

      if (user) {

        return await axios
          .put(data.url, data.body,
            {
              headers: {
                'Content-Type': 'binary/octet-stream',
                'Cache-Control': 'max-age=86400',
                'language': locale
              },
              errorsPass: data.errorsPass ? data.errorsPass : [],
              passAllErrors: true

            },
          )
          .then((response) => {
            return response;
          })
          .catch(error => {
            this.dispatch('reauth', () => {
              this.dispatch('postFileApi', data);
            });
          });

      }

    },

    async putApi(context, data = {}) {
      if (!data.url || !data.body) {
        return false
      }

      const body = data.body;
      let token = null;
      let user = this.getters.getUser;

      if (this.getters.isLinkedinSignin) {
        token = localStorage.getItem('id_token');

      } else {
        if (!user) {
          user = this.getters.getAuthUser;
        }

        if (!user) {
          user = await Auth.currentAuthenticatedUser();
        }

        if (user) {
          token = user.signInUserSession.idToken.jwtToken;
        }
      }

      let locale = context.rootState.i18n.locale;
      if (token) {
        return await axios
          .put(data.url, data.body, {
              headers: {
                'Authorization': 'Bearer ' + token,
                'language': locale
              },
              errorsPass: data.errorsPass ? data.errorsPass : [],
              passAllErrors: data.passAllErrors ? true : false

            },
          )
          .then(response => response)
          .catch(error => {
            this.dispatch('reauth', () => {
              this.dispatch('putApi', data);
            });
          });
      }

    },
    async putEditPers(context, data = {}) {
      if (!data.url || !data.body) {
        return false
      }

      const body = data.body;
      let token = null;
      let user = this.getters.getUser;

      if (this.getters.isLinkedinSignin) {
        token = localStorage.getItem('id_token');

      } else {
        if (!user) {
          user = this.getters.getAuthUser;
        }

        if (!user) {
          user = await Auth.currentAuthenticatedUser();
        }

        if (user) {
          token = user.signInUserSession.idToken.jwtToken;
        }
      }

      let locale = context.rootState.i18n.locale;
      if (token) {
        return await axios
          .put(data.url, data.body, {
              headers: {
                'Authorization': 'Bearer ' + token,
                'language': locale
              },
              errorsPass: data.errorsPass ? data.errorsPass : [],
              passAllErrors: data.passAllErrors ? true : false

            },
          )
          .then(function (response) {
            return response
          })
          .catch(error => {
            this.dispatch('reauth', () => {
              this.dispatch('putApi', data);
            });
          });
      }

    },

    async testGet(context, url, refreshed = false) {
      if (!url) {
        return false;
      }
      return await this.dispatch('getApi', {url: url})
    },
    async testPost(context, data) {
      if (!data.url) {
        return false;
      }

      return await this.dispatch('postApi', {
        url: data.url,
        body: JSON.parse(data.body)
      });
    },
    testPut(context, data) {
      if (!data.url) {
        return false;
      }

      this.dispatch('putApi', {
        url: data.url,
        body: JSON.parse(data.body)
      });
    },
    testDelete(context, url) {
      if (!url) {
        return false;
      }

      this.dispatch('deleteApi', {url: url})
    },
    async createEvent(context, data) {
      var strings = data.event.strings;
      const discountHash = localStorage.getItem('openexpoDiscountHash');
      if (discountHash) {
        data.event.discount = discountHash;
      }

      return await this.dispatch('postApi', {
        url: 'https://' + apiUrl + '/event',
        // body: JSON.stringify({
        //   event: data
        // })
        body: data.event,
        callback: (response) => {
          {
            if (response.data.statusCode == 200 && response.data.body.id) {
              var result = response;

              if (data.event.strings && data.event.strings.length) {

                let locale = context.rootState.i18n.locale;
                let strings = [];
                data.event.strings.forEach((item) => {
                  let string = item;
                  string.ref = 'event';
                  string.ref_id = response.data.body.id;
                  string.language = locale;
                  strings.push(string);
                });

                this.dispatch('postSingleString', strings)
                  .then(response => {
                    if (data.callback) {
                      data.callback(result);
                    } else {
                      console.log(result);
                    }
                  })
                  .catch(error => console.log('postStringError', error));

                localStorage.removeItem('openexpoDiscountHash');
              } else {
                if (data.callback) {
                  data.callback(result);
                }
              }

            }
          }
        }
      })
        .then(response => {
        })
        .catch(error => console.log(error));
    },
    async apiCheckCustomName(context, data, refreshed = false) {
      if (!data.type || !data.customName) {
        return false;
      }
      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/${data.type}/customnameexists/${data.customName}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => {
        console.log('refreshed', err);
      })
    },
    async publishEvent(context, data) {
      if (!data.id) {
        return false
      }

      await this.dispatch('postApi', {
        url: 'https://' + apiUrl + '/event/' + data.id + '/publish',
        body: {}
      })
        .then(response => {
          if (data.callback) {
            data.callback(response);
          } else {
          }
        })
        .catch(e => console.log(e));

    },
    async unpublishEvent(context, data) {
      if (!data.id) {
        return false
      }

      await this.dispatch('postApi', {
        url: 'https://' + apiUrl + '/event/' + data.id + '/unpublish',
        body: {},
        callback(response) {
          if (data.callback) {
            data.callback(response);
          }
        }
      })

    },
    async updateEvent(context, data) {
      if (!data.event.id) {
        return false;
      }
      if(data.event.branding) delete data.event.branding;
      if(data.event.strings) delete data.event.strings;
      return await this.dispatch('putApi', {
        url: 'https://' + apiUrl + '/event/' + data.event.id,
        body: data.event
      }).then(async (response) => {
        let callbackCalled = false;
        let checkUpdateEnd = function (queryObj) {
          for (let prop in queryObj) {
            if (queryObj[prop] == false) {
              return false;
            }
          }
          if (data.callback && !callbackCalled) {
            callbackCalled = true;
            data.callback();
          }
        };

        if (response.data.statusCode == 200 && response.data.body.id) {
          var result = response;
          let queryObj = {};
          queryObj.newStringsQuery = false;
          queryObj.oldStringsQuery = false;
          queryObj.downloadablesQuery = false;
          queryObj.evtDayListQuery = false;
          queryObj.evtOthersQuery = false;
          if (data.newStrings && data.newStrings.length) {
            let locale = context.rootState.i18n.locale;
            let strings = [];
            data.newStrings.forEach((item) => {
              let string = item;
              string.ref = 'event';
              string.ref_id = response.data.body.id;
              string.language = locale;
              strings.push(string);
            });

            this.dispatch('postSingleString', strings).then(res => {
              queryObj.newStringsQuery = true;
              checkUpdateEnd(queryObj);
            });

          } else {
            queryObj.newStringsQuery = true;
            checkUpdateEnd(queryObj);
          }

          if (data.oldStrings && data.oldStrings.length) {

            let locale = context.rootState.i18n.locale;
            let strings = [];
            data.oldStrings.forEach((item) => {

              let string = item;
              string.ref = 'event';
              string.ref_id = response.data.body.id;
              string.language = locale;

              strings.push(string);

              this.dispatch('putSingleString', string).then(resp => {
                queryObj.oldStringsQuery = true;
                checkUpdateEnd(queryObj);
              });

            });
          } else {
            queryObj.oldStringsQuery = true;
            checkUpdateEnd(queryObj);
          }

          if (data.downloadables) {

            let dwnlNewQuery = false;
            let dwnlDelQuery = false;
            if (data.downloadables.new && data.downloadables.new.length) {
              await Promise.all(data.downloadables.new.map(fileItem => {
                return this.dispatch('uploadFileWithThumbnail', {
                  id: response.data.body.id,
                  post_type: 'event',
                  file: fileItem,
                });
              }));

              dwnlNewQuery = true;
              if (dwnlNewQuery && dwnlDelQuery) {
                queryObj.downloadablesQuery = true;
                checkUpdateEnd(queryObj);
              }
            } else {
              dwnlNewQuery = true;
              if (dwnlNewQuery && dwnlDelQuery) {
                queryObj.downloadablesQuery = true;
                checkUpdateEnd(queryObj);
              }
            }
            // need to discuss
            if (data.downloadables.maps && Object.keys(data.downloadables.maps).length) {
              let i = 0;
              for (const fileId in data.downloadables.maps) {
                if (!data.downloadables.maps[fileId]) {

                  /* delete_file */
                  this.dispatch('deleteFile', {
                    id: fileId,
                    callback: (resp) => {
                      if (i == (Object.keys(data.downloadables.maps).length - 1)) {
                        dwnlDelQuery = true;
                        if (dwnlNewQuery && dwnlDelQuery) {
                          queryObj.downloadablesQuery = true;
                          checkUpdateEnd(queryObj);
                        }
                      }
                      i++;
                    }
                  });
                } else {
                  if (i == (Object.keys(data.downloadables.maps).length - 1)) {
                    dwnlDelQuery = true;
                    if (dwnlNewQuery && dwnlDelQuery) {
                      queryObj.downloadablesQuery = true;
                      checkUpdateEnd(queryObj);
                    }
                  }
                  i++;
                }
              }
            } else {
              dwnlDelQuery = true;
              if (dwnlNewQuery && dwnlDelQuery) {
                queryObj.downloadablesQuery = true;
                checkUpdateEnd(queryObj);
              }
            }

          } else {
            queryObj.downloadablesQuery = true;
            checkUpdateEnd(queryObj);
          }

          if (data.evtDayList && data.evtDayList.length) {
            let index = 0;
            data.evtDayList.forEach(item => {

              if (item.dateStart && item.dateEnd && !item.toDelete && !item.id) {
                this.dispatch('createActivity', {
                  body: {
                    "event": response.data.body.id,
                    "start": item.dateStart,
                    "end": item.dateEnd,
                    "timezone": response.data.body.timezone,
                    "value": "{}",
                    "visibility": "event_internal",
                    "tags": ["type:working_schedule"]
                  },
                  callback: (response) => {
                    if (index == (data.evtDayList.length - 1)) {
                      queryObj.evtDayListQuery = true;
                      checkUpdateEnd(queryObj);
                    }
                    index++;
                  }

                });
              } else if (item.dateStart && item.dateEnd && !item.toDelete && item.id) {
                this.dispatch('updateActivity', {
                  body: {
                    "id": item.id,
                    "event": response.data.body.id,
                    "start": item.dateStart,
                    "end": item.dateEnd,
                    "timezone": response.data.body.timezone,
                    "value": "{}",
                    "visibility": "event_internal",
                    "tags": ["type:working_schedule"]
                  },
                  callback: (response) => {
                    if (index == (data.evtDayList.length - 1)) {
                      queryObj.evtDayListQuery = true;
                      checkUpdateEnd(queryObj);
                    }
                    index++;
                  }

                });
              } else if (item.id && item.toDelete) {
                this.dispatch('deleteActivity', {
                  id: item.id,
                  callback() {
                    if (index == (data.evtDayList.length - 1)) {
                      queryObj.evtDayListQuery = true;
                      checkUpdateEnd(queryObj);
                    }
                    index++;
                  }
                });
              } else {
                if (index == (data.evtDayList.length - 1)) {
                  queryObj.evtDayListQuery = true;
                  checkUpdateEnd(queryObj);
                }
                index++;
              }

            });

          } else {
            queryObj.evtDayListQuery = true;
            checkUpdateEnd(queryObj);
          }

          this.dispatch('sendAgenda', {
            type: 'event',
            id: response.data.body.id,
            agenda: data.agenda,
            callback: async (res) => {

              await this.dispatch('sendCollections', {
                eventId: response.data.body.id,
                collections: data.collections
              });


              await this.dispatch('sendProducts', {
                eventId: response.data.body.id,
                products: data.products
              });

              this.dispatch('sendPricing', {
                id: response.data.body.id,
                pricing: data.pricing,
                posttype: 'event,'
              })
                .then(res => {
                  this.dispatch('uploadBrandings', {
                    id: response.data.body.id,
                    brandings: data.eventBranding,
                    posttype: 'event',
                    callback: (response) => {
                      if (data.callback) {
                        queryObj.evtOthersQuery = true;
                        checkUpdateEnd(queryObj);
                      }
                    }
                  });
                });
            }
          });
        }
      })
        .catch(error => console.log(error));
    },

    async getCategories(context, url) {
      return await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/dict?type=category'})
    },
    async getCountries(context, url) {
      return await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/dict?type=country'})
    },
    async getIndustries(context, url) {
      return await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/dict?type=industry'})
    },
    async getLanguages(context, callback) {
      await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/dict?type=language&ignorelanguage=true'})
        .then(response => {
          if (callback) {
            callback(response)
          }
        })
        .catch(err => console.log(err));
    },
    async getTimezones(context, url) {
      return await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/dict?type=timezone'})
    },
    async getFuturedEventsByCat(context, data) {

      this.dispatch('getUApi', {url: 'https://' + apiUrl + '/event/recommended?category=' + data.category_id})
        .then(response => {
          data.callback(response);
        })
        .catch(err => console.log(err));
    },

    async getEvents(context, data) {
      const type = data.type ? data.type : 'all';
      let queryString = '';
      const queryArr = [];
      if (data && (data.search || data.category || data.type)) {
        queryString = '?';
        if (data.search) {
          queryArr.push('str=' + data.search)
        }
        if (data.category) {
          queryArr.push('category=' + data.category)
        }
        if (data.type) {
          queryArr.push('type=' + data.type)
        }
        queryString += queryArr.join('&');
      }
      this.dispatch('getUApi', {url: 'https://' + apiUrl + '/event/search' + queryString})
        .then(response => {
          if (data.callback) {
            data.callback(response);
          }
        })
        .catch(err => console.log(err));
    },

    async getEventsSearch(context, data) {
      const str = data.search ? data.search : '';

      this.dispatch('getApi', {url: 'https://' + apiUrl + '/event/search?str=' + str})
        .then(response => {
          data.callback(response);
        })
        .catch(err => console.log(err));
    },

    async apiGetEvent(context, data) {
      if (!data.id) {
        return false;
      }
      return await this.dispatch('getApi', {url: 'https://' + apiUrl + '/event/' + data.id})
        .then(response => {
          if (data.callback) {
            data.callback(response);
          }
        })
        .catch(error => console.log(error));
    },

    async apiGetUEvent(context, data) {
      if (!data.id) {
        return false;
      }
      return await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/open/event/' + data.id})
        .then(response => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log('apiGetEvent - ', response);
          }
        })
        .catch(error => console.log(error));
    },


    async getUserEvents(context, data) {

      this.dispatch('getApi', {url: 'https://' + apiUrl + '/user/myevents?type=' + data.type})
        .then(response => {
          if (data.callback) {
            data.callback(response);
          }
        })
        .catch(err => console.log(err));
    },

    getUserEventsA(context, data ) {
      return this.dispatch('getApi', {url: 'https://'+apiUrl+'/user/myevents?type='+data.type});
    },

    async postSingleString(context, data) {
      return await this.dispatch('postApi', {
        url: 'https://' + apiUrl + '/strings',
        body: data
      })
    },

    async putSingleString(context, data) {
      return await this.dispatch('putApi', {
        url: 'https://' + apiUrl + '/strings/' + data.id,
        body: data
      })
    },

    async deleteSingleString(context, data) {
      return await this.dispatch('deleteApi', {
        url: 'https://' + apiUrl + '/strings/' + data.id,
        body: data
      })
    },

    async eventGetStands(context, data) {
      if (!data.id) {
        console.log('eventGetStands - No ID');
        return false;
      }
      let queryString = '';
      if (data.type) {
        queryString = '?type=' + data.type;
      }
      if (data.search) {
        queryString += "&str=" + data.search;
      }
      if (data.status) {
        queryString += "&status=" + data.status;
      }
      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/open/event/${data.id}/stands${queryString}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          }
        })
        .catch(err => console.log(err));

    },
    async eventAuthGetStands(context, data) {
      if (!data.id) {
        return false;
      }
      let queryString = '';
      if (data.type) {
        queryString = '?type=' + data.type;
      }
      if (data.search) {
        queryString += "&str=" + data.search;
      }
      if (data.status) {
        queryString += "&status=" + data.status;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/event/${data.id}/stands${queryString}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          }
        })
        .catch(err => console.log(err));

    },
    eventAuthGetStandsA(context, data) {
      if (!data.id) {
        return false;
      }
      let queryString = '';
      if (data.type) {
        queryString = '?type=' + data.type;
      }
      if (data.search) {
        queryString += "&str=" + data.search;
      }
      if (data.status) {
        queryString += "&status=" + data.status;
      }
      return this.dispatch('getApi', {
        url: `https://${apiUrl}/event/${data.id}/stands${queryString}`
      });
    },
    eventGetInvitations(context, data) {
      this.dispatch('getApi', {
        url: `https://${apiUrl}/event/${data.id}/getstandinvitations`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          }
        })
        .catch(err => console.log(err));
    },
    userGetStands(context, data) {
      this.dispatch('getApi', {
        url: `https://${apiUrl}/user/mystands`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          }
        })
        .catch(err => console.log(err));

    },
    getUserStandsA() {
      return this.dispatch('getApi', {
        url: `https://${apiUrl}/user/mystands`
      });
    },
    userGetInvitations(context, data ) {
      this.dispatch('getApi', {
        url: `https://${apiUrl}/user/getstandinvitations`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          }
        })
        .catch(err => console.log(err));

    },

    sendStandInvitation(context, data) {
      if (!data.event_id || !data.email) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/stand/invitation/${data.event_id}/${data.email}`,
        body: data
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },

    async acceptStandInvitation(context, data) {
      if (!data.invitation_id) {
        return false;
      }
      await this.dispatch('postApi', {
        url: `https://${apiUrl}/stand/invitation/accept/${data.invitation_id}`,
        body: {},
        callback: (response) => {
          if (data.callback(response)) {
            data.callback(response);
          }
        }
      }).then(response => {

        console.log(response);
      }).catch(err => console.log(err))
    },

    async rejectStandInvitation(context, data) {
      if (!data.invitation_id) {
        return false;
      }
      await this.dispatch('postApi', {
        url: `https://${apiUrl}/stand/invitation/reject/${data.invitation_id}`,
        body: {},
        callback: (response) => {
          if (data.callback(response)) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {
        // console.log(response);
      }).catch(err => console.log(err))
    },

    async rejectInvitation(context, data) {
      if (!data.invitation_id) {
        return false;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/confirmation/resolve/${data.invitation_id}?res=reject`,
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },

    async acceptInvitation(context, data) {
      if (!data.invitation_id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/confirmation/resolve/${data.invitation_id}?res=accept`,
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },

    async cancelStandInvitation(context, data) {
      if (!data.invitation_id) {
        return false;
      }
      await this.dispatch('postApi', {
        url: `https://${apiUrl}/event/invitation/cancel/${data.invitation_id}`,
        body: {},
        callback: (response) => {
          if (data.callback(response)) {
            data.callback(response);
          }
        }
      }).then(response => {


      }).catch(err => console.log(err))
    },

    async createStand(context, data) {
      console.log('Stand Create', data);

      var strings = data.strings;

      return await this.dispatch('postApi', {
        url: 'https://' + apiUrl + '/stand',
        body: data.body
      })
        .then(response => {
          if (response.data.statusCode == 200 && response.data.body.id) {
            if (data.strings && data.strings.length) {
              let locale = context.rootState.i18n.locale;
              let strings = [];
              data.strings.forEach((item) => {
                let string = item;
                string.ref = 'stand';
                string.ref_id = response.data.body.id;
                string.language = locale;
                strings.push(string);
              });
              this.dispatch('postSingleString', strings);
            }

            if (data.downloadables && data.downloadables.length) {

              this.dispatch('uploadFiles', {
                id: response.data.body.id,
                post_type: 'stand',
                files: downloadables,
              });

            }
            data.callback(response);
          }
        })
        .catch(error => console.log(error));

    },

    async apiGetStand(context, data) {
      return await this.dispatch('getApi', {url: 'https://' + apiUrl + '/stand/' + data.id})
        .then(response => data.callback(response))
        .catch(err => console.log(err));
    },
    async apiGetUStand(context, data) {
      return await this.dispatch('getUApi', {url: 'https://' + apiUrl + '/open/stand/' + data.id})
        .then(response => data.callback(response))
        .catch(err => console.log(err));
    },
    async getStandsByUser(context, data) {
      return await this.dispatch('getApi', {url: 'https://' + apiUrl + '/user/mystands'})
        .then(response => data.callback(response))
        .catch(err => console.log(err));
    },
    async updateStand(context, data) {
      var strings = data.strings;
      if(data.body.branding) delete data.body.branding;
      if(data.body.strings)  delete data.body.strings;
      return await this.dispatch('putApi', {
        url: 'https://' + apiUrl + '/stand/' + data.body.id,
        body: data.body
      })
        .then(async (response) => {
          let callbackCalled = false;
          let checkUpdateEnd = function (queryObj) {
            for (let prop in queryObj) {
              if (queryObj[prop] == false) {
                return false;
              }
            }
            if (data.callback && !callbackCalled) {
              callbackCalled = true;
              data.callback();
            }
          };

          if (response.data.statusCode == 200 && response.data.body.id) {
            let queryObj = {};
            queryObj.newStringsQuery = false;
            queryObj.oldStringsQuery = false;
            queryObj.downloadablesQuery = false;

            queryObj.standOthersQuery = false;

            if (data.newStrings && data.newStrings.length) {

              let locale = context.rootState.i18n.locale;
              let strings = [];
              data.newStrings.forEach((item) => {
                let string = item;
                string.ref = 'stand';
                string.ref_id = response.data.body.id;
                string.language = locale;
                strings.push(string);
              });
              this.dispatch('postSingleString', strings).then(res => {
                queryObj.newStringsQuery = true;
                checkUpdateEnd(queryObj);
              });

            } else {
              queryObj.newStringsQuery = true;
              checkUpdateEnd(queryObj);
            }

            if (data.oldStrings && data.oldStrings.length) {

              let locale = context.rootState.i18n.locale;
              let strings = [];
              data.oldStrings.forEach((item) => {

                let string = item;
                string.ref = 'stand';
                string.ref_id = response.data.body.id;
                string.language = locale;
                strings.push(string);
                this.dispatch('putSingleString', string).then(resp => {
                  queryObj.oldStringsQuery = true;
                  checkUpdateEnd(queryObj);
                });

              });

            } else {
              queryObj.oldStringsQuery = true;
              checkUpdateEnd(queryObj);
            }

            if (data.downloadables) {
              let dwnlNewQuery = false;
              let dwnlDelQuery = false;

              if (data.downloadables.new && data.downloadables.new.length) {
                await Promise.all(data.downloadables.new.map(fileItem => {
                  return this.dispatch('uploadFileWithThumbnail', {
                    id: response.data.body.id,
                    post_type: 'stand',
                    file: fileItem,
                  });
                }));

                dwnlNewQuery = true;
                if (dwnlNewQuery && dwnlDelQuery) {
                  queryObj.downloadablesQuery = true;
                  checkUpdateEnd(queryObj);
                }
              } else {
                dwnlNewQuery = true;
                if (dwnlNewQuery && dwnlDelQuery) {
                  queryObj.downloadablesQuery = true;
                  checkUpdateEnd(queryObj);
                }
              }

              if (data.downloadables.maps && Object.keys(data.downloadables.maps).length) {
                let i = 0;
                for (const fileId in data.downloadables.maps) {
                  if (!data.downloadables.maps[fileId]) {
                    /* delete_file */
                    this.dispatch('deleteFile', {
                      id: fileId,
                      callback: (resp) => {
                        if (i == (Object.keys(data.downloadables.maps).length - 1)) {
                          dwnlDelQuery = true;
                          if (dwnlNewQuery && dwnlDelQuery) {
                            queryObj.downloadablesQuery = true;
                            checkUpdateEnd(queryObj);
                          }
                        }
                        i++;

                      }
                    });
                  } else {
                    if (i == (Object.keys(data.downloadables.maps).length - 1)) {
                      dwnlDelQuery = true;
                      if (dwnlNewQuery && dwnlDelQuery) {
                        queryObj.downloadablesQuery = true;
                        checkUpdateEnd(queryObj);
                      }
                    }
                    i++;
                  }
                }
              } else {
                dwnlDelQuery = true;
                if (dwnlNewQuery && dwnlDelQuery) {
                  queryObj.downloadablesQuery = true;
                  checkUpdateEnd(queryObj);
                }
              }

            } else {
              queryObj.downloadablesQuery = true;
              checkUpdateEnd(queryObj);
            }

            this.dispatch('sendAgenda', {
              type: 'stand',
              id: response.data.body.id,
              agenda: data.agenda,
              callback: async (res) => {

                await this.dispatch('sendCollections', {
                  eventId: data.body.event,
                  standId: response.data.body.id,
                  collections: data.collections
                });

                await this.dispatch('sendProducts', {
                  eventId: data.body.event,
                  standId: response.data.body.id,
                  products: data.products
                });

                this.dispatch('uploadBrandings', {
                  id: response.data.body.id,
                  brandings: data.standBranding,
                  posttype: 'stand',
                  callback: (response) => {
                    if (data.callback) {
                      // data.callback(response);
                      queryObj.standOthersQuery = true;
                      checkUpdateEnd(queryObj);
                    }
                  }
                });

              }
            });
          }
        })
        .catch(error => console.log(error));

    },

    uploadBrandings(context, data) {

      if (data.brandings && data.id && data.posttype) {
        let tcp = true;
        let lp = true;
        let mcp = true;
        let cp = true;
        let bp = true;

        if (data.brandings.templateBanner && data.brandings.templateBanner.new && data.brandings.templateBanner.new.length) {

          if (data.brandings.maps.templateBanner) {
            this.dispatch('deleteFile', {
              id: data.brandings.maps.templateBanner,
            });
          }

          bp = false;

          this.dispatch('uploadFiles', {
            id: data.id,
            post_type: data.posttype,
            files: data.brandings.templateBanner.new,
            category: 'branding',
            description: 'banner_image',

            callback(resp) {
              bp = true;
              if (bp && tcp && lp && mcp && cp && data.callback) {
                data.callback();
              }
            },

          });
        } else if (data.brandings.templateBanner && data.brandings.templateBanner.todelete && data.brandings.maps.templateBanner) {
          this.dispatch('deleteFile', {
            id: data.brandings.maps.templateBanner,
          });
        }

        if (data.brandings.templateCover && data.brandings.templateCover.new && data.brandings.templateCover.new.length) {

          if (data.brandings.maps.templateCover) {
            this.dispatch('deleteFile', {
              id: data.brandings.maps.templateCover,
            });
          }

          tcp = false;

          this.dispatch('uploadFiles', {
            id: data.id,
            post_type: data.posttype,
            files: data.brandings.templateCover.new,
            category: 'branding',
            description: 'main_image',

            callback(resp) {
              tcp = true;
              if (bp && tcp && lp && mcp && cp && data.callback) {
                data.callback();
              }
            },

          });
        } else if (data.brandings.templateCover && data.brandings.templateCover.todelete && data.brandings.maps.templateCover) {
          this.dispatch('deleteFile', {
            id: data.brandings.maps.templateCover,
          });
        }


        if (data.brandings.mainContent && data.brandings.mainContent.new && data.brandings.mainContent.new.length) {

          if (data.brandings.maps.mainContent) {
            /* delete item by id (maps.templateCover contains id) */
            this.dispatch('deleteFile', {
              id: data.brandings.maps.mainContent,
            });
          }
          mcp = false;
          this.dispatch('uploadFiles', {
            id: data.id,
            post_type: data.posttype,
            files: data.brandings.mainContent.new,
            category: 'branding',
            description: 'content_main_image',

            callback(resp) {
              mcp = true;
              if (bp && tcp && lp && mcp && cp && data.callback) {
                data.callback();
              }
            },

          });
        } else if (data.brandings.mainContent && data.brandings.mainContent.todelete && data.brandings.maps.mainContent) {
          this.dispatch('deleteFile', {
            id: data.brandings.maps.mainContent,
          });
        }

        if (data.brandings.logo && data.brandings.logo.new && data.brandings.logo.new.length) {
          if (data.brandings.maps.logo) {
            /* delete item by id (maps.templateCover contains id) */
            this.dispatch('deleteFile', {
              id: data.brandings.maps.logo,
            });
          }
          lp = false;
          this.dispatch('uploadFiles', {
            id: data.id,
            post_type: data.posttype,
            files: data.brandings.logo.new,
            category: 'branding',
            description: 'logo_image',

            callback(resp) {
              lp = true;
              if (bp && tcp && lp && mcp && cp && data.callback) {
                data.callback();
              }
            },

          });
        } else if (data.brandings.logo && data.brandings.logo.todelete && data.brandings.maps.logo) {

          this.dispatch('deleteFile', {
            id: data.brandings.maps.logo,
          });
        }

        if (data.brandings.mainCarousel) {

          let carousel_index = 0;

          if (data.brandings.mainCarousel.new.length && data.brandings.mainCarousel.new[0].image.length) {
            cp = false;
          }

          data.brandings.mainCarousel.new.forEach(carouselItem => {
            if (carouselItem.image.length) {
              this.dispatch('uploadFiles', {
                id: data.id,
                post_type: data.posttype,
                files: carouselItem.image,
                category: 'branding',
                description: 'content_carousel',

                callback(resp) {
                  if (carousel_index == (data.brandings.mainCarousel.new.length - 1)) {
                    cp = true;
                  }
                  carousel_index++;
                  if (bp && tcp && lp && mcp && cp && data.callback) {
                    data.callback();
                  }
                },

              });
            } else {
              if (carousel_index == (data.brandings.mainCarousel.new.length - 1)) {
                cp = true;
              }
              carousel_index++;
              if (bp && tcp && lp && mcp && cp && data.callback) {
                data.callback();
              }
            }

          });

          data.brandings.mainCarousel.todelete.forEach(item => {
            this.dispatch('deleteFile', {
              id: item,
            });
          });
        }

        if (bp && tcp && lp && mcp && cp && data.callback) {
          data.callback();
        }


      } else {
        if (data.callback) {
          data.callback();
        }
      }

    },

// UPLOAD FILES API
    uploadFiles(context, data) {

      const that = this;


      data.files.forEach(file => {


        this.dispatch('getUploadFileUrl', {
          id: data.id,
          post_type: data.post_type,
          file: file,
          ref: data.ref ? data.ref : false,
          ref_id: data.ref ? data.ref_id : false,
          url: data.url ? encodeURI(data.url) : false,
          relationid: data.relationid ? data.relationid : false,
          category: data.category,
          description: data.description,
          tags: file.tags ? file.tags : [],

          callback(res_url) {

            if (!res_url.data.body.url) {
              return false;
            }
            that.dispatch('postFileApi', {

              url: res_url.data.body.url,
              body: file.file

            }).then(response => {

              if (data.callback) {
                data.callback(res_url);
              }

            }).catch(err => console.log(err));


          }

        });

      });

    },

    async uploadFilePersonnel(context, data) {
      if (data.file.priceTags?.length) {
        data.file.priceTags.forEach(tag => {
          if (tag.selected) {
            data.file.tags.push(tag.value);
          }
        });
      }

      const fileUrl = await this.dispatch('getUploadFileUrlA', {
        id: data.id,
        post_type: data.post_type,
        file: data.file,
        ref: data.ref || false,
        ref_id: data.ref_id || false,
        url: data.url ? encodeURI(data.url) : false,
        relationid: data.relationid || false,
        category: data.category,
        description: 'logo_image',
        tags: data.file.tags || [],
      }).then(response => {
        return this.dispatch('postFileApi', {
          url: response.data.body.url,
          body: data.file
        }).then(async (response) => {
          this.dispatch('')
          return response;
        }).catch(err => console.log(err));

        if (!fileUrl?.data?.body?.url) {
          return false;
        }

        if (data.file.newStrings?.length) {
          let locale = context.rootState.i18n.locale;
          const strings = data.file.newStrings.map(string => {
            return {
              ...string,
              ref: 'upload',
              ref_id: fileUrl.data.body.id,
              language: locale
            }
          });
        }
      })
        .catch(err => console.log(`ERROR during posting file: ${err}`));
    },
    async uploadFileWithThumbnail(context, data) {
      if (data.file.priceTags?.length) {
        data.file.priceTags.forEach(tag => {
          if (tag.selected) {
            data.file.tags.push(tag.value);
          }
        });
      }
      const fileUrl = await this.dispatch('getUploadFileUrlA', {
        id: data.id,
        post_type: data.post_type,
        file: data.file,
        ref: data.ref || false,
        ref_id: data.ref || false,
        url: data.url ? encodeURI(data.url) : false,
        relationid: data.relationid || false,
        category: data.category,
        description: data.description,
        tags: data.file.tags || [],
      });

      if (!fileUrl?.data?.body?.url) {
        return false;
      }

      return this.dispatch('postFileApi', {
        url: fileUrl.data.body.url,
        body: data.file.file
      }).then(async (response) => {
        if (data.file.thumbnail?.length) {
          await this.dispatch('uploadFiles', {
            id: data.id,
            ref: 'upload',
            ref_id: fileUrl.data.body.id,
            post_type: data.post_type,
            files: data.file.thumbnail,
            category: 'branding',
            description: 'upload_thumb',
          });
        }

        if (data.file.newStrings?.length) {
          let locale = context.rootState.i18n.locale;
          const strings = data.file.newStrings.map(string => {
            return {
              ...string,
              ref: 'upload',
              ref_id: fileUrl.data.body.id,
              language: locale
            }
          });

          await this.dispatch('postSingleString', strings);
        }
      })
        .catch(err => console.log(`ERROR during posting file: ${err}`));
    },
    async getUploadFileUrlA(context, data) {

      const category = data.category ? data.category : 'binary';
      const filename = data.file.fileName ? data.file.fileName : data.file.name;
      const title = data.file.fileTitle ? data.file.fileTitle : data.file.name;

      let description = data.description;
      if (!description) {
        description = data.file.fileDesc ? data.file.fileDesc : 'none';
      }

      const ref = data.ref ? `&ref=${data.ref}&ref_id=${data.ref_id}` : '';
      const url = data.url ? `&url=${encodeURI(data.url)}` : '';
      const relationid = data.relationid ? `&relationid=${data.relationid}` : '';
      return await this.dispatch('postApi', {
        url: `https://${apiUrl}/${data.post_type}/${data.id}/createUploadURL?category=${category}${ref}${url}${relationid}`,
        body: {
          titul: title, //we use another word as title is one of keywords in openapi, so corrupts schema
          description: description,
          filename: filename,
          tags: data.tags ? data.tags : [],
        }
      }).then(response => {
        return response;
      }).catch(err => console.log(err));
    },
    getUploadFileUrl(context, data) {
      const category = data.category ? data.category : 'binary';
      const filename = data.file.fileName ? data.file.fileName : data.file.name;
      const title = data.file.fileTitle ? data.file.fileTitle : data.file.name;

      let description = data.description;
      if (!description) {
        description = data.file.fileDesc ? data.file.fileDesc : 'none';
      }

      const ref = data.ref ? `&ref=${data.ref}&ref_id=${data.ref_id}` : '';
      const url = data.url ? `&url=${encodeURI(data.url)}` : '';
      const relationid = data.relationid ? `&relationid=${data.relationid}` : '';

      this.dispatch('postApi', {
        url: `https://${apiUrl}/${data.post_type}/${data.id}/createUploadURL?category=${category}${ref}${url}${relationid}`,
        body: {
          titul: title, //we use another word as title is one of keywords in openapi, so corrupts schema
          description: description,
          filename: filename,
          tags: data.tags ? data.tags : [],
        },
        callback: response => {
          if (data.callback(response)) {
            data.callback(response);
          }
        }
      })
    },

    getDownloadFileUrl(context, data) {
      this.dispatch('getUApi', {
        url: `https://${apiUrl}/binary/downloadURL/${data.id}`
      })
        .then(response => {
          data.callback(response)
        })
        .catch(err => console.log(err));
    },

    deleteFile(context, data) {
      if (!data.id) {
        return false;
      }
      this.dispatch('deleteApi', {
        url: `https://${apiUrl}/binary/${data.id}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response);
          }
        })
        .catch(err => console.log(err));
    },

    /* ACTIVITY */
    async createActivity(context, data) {

      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/activity`,
        body: data.body,
        callback: async (response) => {

          if(response.data.statusCode !== 200){
            context.commit('setAgendaError',response.data.body)
            context.commit('setAgendaName',data.body.name)
            return false
          } else {
            if (data.thumbnail?.length) {
              await this.dispatch('uploadFiles', {
                id: data.body.stand || data.body.event,
                ref: 'activity',
                ref_id: response.data.body.id,
                post_type: data.body.stand ? 'stand' : 'event',
                files: data.thumbnail,
                category: 'branding',
                description: 'activity_thumb',
              });
            }

            if (data.callback(response)) {
              data.callback(response);
            }
          }
        }
      }).then(response => {

      }).catch(err => console.log(err))

    },

    async updateActivity(context, data) {

      if (!data.body) {
        return false;
      }

      await this.dispatch('putApi', {
        url: `https://${apiUrl}/activity/${data.body.id}`,
        body: data.body
      }).then(async (response) => {
        if (data.removeImage) {
          await this.dispatch('deleteFile', {
            id: data.removeImage,
          });
        }
        if(response.data.statusCode !== 200){
          context.commit('setAgendaError',response.data.body)
          context.commit('setAgendaName',data.body.name)
          return false
        } else {
          if (data.thumbnail?.length) {
            await this.dispatch('uploadFiles', {
              id: data.body.stand || data.body.event,
              ref: 'activity',
              ref_id: response.data.body.id,
              post_type: data.body.stand ? 'stand' : 'event',
              files: data.thumbnail,
              category: 'branding',
              description: 'activity_thumb',
            });
          }
          if (data.callback(response)) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }

      }).catch(err => console.log(err))

    },

    async getActivity(context, data) {
      /*
        posttype, id, type, callback
      */
      await this.dispatch('getApi', {
        url: ` https://${apiUrl}/${data.postType}/${data.id}/editschedule?type=${data.type}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },

    async getUActivity(context, data) {
      /*
        posttype, id, type, callback
      */

      let url = '';
      let apiType = '';
      if (data.user) {
        url = `https://${apiUrl}/${data.postType}/${data.id}/schedule?type=${data.type}`;
        apiType = 'getApi';
      } else {
        url = `https://${apiUrl}/open/${data.postType}/${data.id}/schedule?type=${data.type}`;
        apiType = 'getUApi';
      }

      await this.dispatch(apiType, {
        url
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },

    async getActivityById(context, data) {
      /*
        posttype, id, type, callback
      */
      await this.dispatch('getApi', {
        url: ` https://${apiUrl}/activity/${data.id}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },

    async getOpenActivityById(context, data) {
      /*
        posttype, id, type, callback
      */
      await this.dispatch('getApi', {
        url: ` https://${apiUrl}/open/activity/${data.id}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },

    async deleteActivity(context, data) {
      /*
        id
      */
      await this.dispatch('deleteApi', {
        url: ` https://${apiUrl}/activity/${data.id}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },
    /* ACTIVITY MEETINGS */

    async userGetMeetings(context, data) {
      if (!data.type) {
        return false;
      }
      let query = '?type=' + data.type;

      if (data.dateEnd) {
        query += '&datestart=' + data.dateStart;
      }
      if (data.dateEnd) {
        query += '&dateend=' + data.dateEnd;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/user/mymeetings${query}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },
    async chatAddMeeting(context, data) {

      if (!data.body || !data.sid) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/chat/${data.sid}/meeting`,
        body: data.body,
        callback(response) {
          if (data.callback) {
            data.callback(response);
          }
        }
      });

    },

    async createActivityMeeting(context, data) {

      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/activity/${data.activityid}/meeting`,
        body: data.body,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {
      }).catch(err => console.log(err))

    },

    async updateActivityMeeting(context, data) {

      if (!data.body) {
        return false;
      }

      await this.dispatch('putApi', {
        url: `https://${apiUrl}/activity/${data.activityid}/meeting`,
        body: data.body
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))

    },

    async getActivityMeeting(context, data) {
      /*
        posttype, id, type, callback
      */
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/activity/${data.activityid}/meeting`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },

    async deleteActivityMeeting(context, data) {
      /*
        id
      */
      await this.dispatch('deleteApi', {
        url: `https://${apiUrl}/activity/${data.activityid}/meeting`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response)
          } else {
            console.log(response);
          }
        })
        .catch(err => console.log(err));
    },

    sendAgenda(context, data) {
      if (!data.type || !data.id || !data.agenda) {
        if (data.callback) {
          data.callback()
        }
        return false;
      }
      if ((!data.agenda.toDelete || !data.agenda.toDelete.length) && (!data.agenda.sessions || !data.agenda.sessions.length)) {
        if (data.callback) {
          data.callback()
        }
      }

      if (data.agenda[0].toDelete) {
        for (let id in data.agenda[0].toDelete) {
          this.dispatch('deleteActivity', {
            id: id,
            callback() {
              if (!data.agenda[0].sessions || !data.agenda[0].sessions.length) {
                if (data.callback) {
                  data.callback()
                }
              }
            }
          });
        }

      }
      if (data.agenda[0].sessions && data.agenda[0].sessions.length) {

        let agendaIndex = 0;
        data.agenda[0].sessions.forEach(item => {

          const agendaTags = ["type:agenda"];

          if (item.tagsList && item.tagsList.length) {
            item.tagsList.forEach(tag => {
              agendaTags.push(tag.text);
            })
          }
          if (item.priceTags?.length) {
            item.priceTags.forEach(tag => {
              if (tag.selected) {
                agendaTags.push(tag.value);
              }
            });
          }
          let body = {
            "start": utc(item.startDateTz),
            "end": utc(item.endDateTz),
            "name": item.sessionTitle,
            "tags": agendaTags,
            "customName": item.customNameWanted || (typeof item.customName === 'string' && item.customName.indexOf('-gen') > -1) ? item.customName : '',
            "profile": item.profile.value || 'webinar',
            "sameStreamAs": item.sameStreamAs?.value,
          };
          let urlValue = ''
          let meetingUrl = '';
          if (item.meetingType && typeof item.meetingType == 'string') {
            let value = item.meetingType;
            item.meetingType = {
              value: value,
            }
          }
          if (item.meetingType && item.meetingType.value == 'twitch') {
            meetingUrl = item.twitch;
          } else if (item.meetingType && item.meetingType.value == 'zoom') {
            meetingUrl = item.zoom;
          } else if (item.meetingType && item.meetingType.value == 'youtube') {
            meetingUrl = item.youtubeMeeting;
          } else if (item.meetingType && item.meetingType.value == 'vimeo') {
            meetingUrl = item.vimeoMeeting;
          }
          if (item.presenter && !item.presenter.value) {
            item.presenter.value = {
              name: item.presenter.name,
              surname: item.presenter.surname,
              id: item.presenter.id,
              logo: item.presenter.logo,
              position: item.presenter.position,
            }
          }

          const attendees = [];
          if(item.presenter) {
            if (item.presenter.value && (!item.presenters || !item.presenters.length || !item.moderator)) {
              attendees.push({
                id: item.presenter.value.id,
                role: 'presenter'
              })
            }
          }

          if (['no_video','webinar', 'team_meeting', 'vimeo', 'zoom'].includes(item.meetingType.value)) {
            if (item.moderator && ['no_video','webinar', 'team_meeting'].includes(item.meetingType.value)) {
              if (!item.moderator.value) {
                item.moderator.value = {
                  name: item.moderator.name,
                  surname: item.moderator.surname,
                  id: item.moderator.id,
                  logo: item.moderator.logo,
                  position: item.moderator.position,
                }
              }

              console.log('sendAgenda --> ', item);

              if (!item.moderator.value.id && !item.moderator.name) {
                if (item.presenters.length) {
                  item.moderator.value = {
                    name: item.presenters[0].value.name,
                    surname: item.presenters[0].value.surname,
                    id: item.presenters[0].value.id,
                    logo: item.presenters[0].value.logo,
                    position: item.presenters[0].value.position,
                  }
                }
              }

              attendees.push({
                id: item.moderator.value.id,
                role: 'moderator',
              })
            }
            if (item.presenters && item.presenters.length) {
              item.presenters.forEach(pres => {
                if (!pres.value) {
                  pres.value = {
                    name: pres.name,
                    surname: pres.surname,
                    id: pres.id,
                    logo: pres.logo,
                    position: pres.position,
                  }
                }

                if (item.moderator && item.moderator.value && !['vimeo', 'zoom'].includes(item.meetingType.value)) {
                  if (pres.value.id != item.moderator.value.id) {
                    attendees.push({
                      id: pres.value.id,
                      role: 'presenter',
                    })
                  }
                } else {
                  attendees.push({
                    id: pres.value.id,
                    role: 'presenter',
                  })
                }

              })
            }
          }
          body['value'] = JSON.stringify({
            meetingUrl: meetingUrl,
            meetingType: item.meetingType ? item.meetingType.value : '',
            enableChat: item.enableChat,
            enableQA: item.enableQA,
            vimeoChat: item.vimeoChat,
            enableVimeoChat: item.enableVimeoChat,
            presenter: item.meetingType && (item.meetingType.value != 'no_video') && item.presenter && item.presenter.value ? {
              name: item.presenter.value.name,
              surname: item.presenter.value.surname,
              id: item.presenter.value.id,
              logo: item.presenter.value.logo,
              position: item.presenter.value.position,
            } : '',
            attendees: ['no_video','webinar', 'team_meeting', 'vimeo', 'zoom'].includes(item.meetingType.value) ? attendees : [],
          });
          body[data.type] = data.id;
          if (data.type == 'stand') {
            body['event'] = item.eventId;
            body["visibility"] = "stand_public";
          } else {
            body["visibility"] = "event_published";
          }

          if (item.dateStart && item.dateEnd && !item.id) {

            this.dispatch('createActivity', {
              body: body,
              thumbnail: item.thumbnail,
                callback: (response) => {
                  if (!item.meetingExist && item.meetingType && item.meetingType.value != 'no_video' && response.data.body.id) {
                    this.dispatch('createActivityMeeting', {
                      activityid: response.data.body.id,
                      body: {
                        url: meetingUrl && (meetingUrl != '#') ? meetingUrl : '',
                      }
                    });
                  }

                  if (item.newStrings && item.newStrings.length) {

                    let locale = context.rootState.i18n.locale;
                    let strings = [];
                    item.newStrings.forEach((str) => {
                      let string = str;
                      string.ref = 'activity';
                      string.ref_id = response.data.body.id;
                      string.language = locale;
                      strings.push(string);
                    });

                    this.dispatch('postSingleString', strings)
                      .then(resp => {
                        if (agendaIndex >= (data.agenda[0].sessions.length - 1)) {
                          if (data.callback) {
                            data.callback();
                          }
                        }
                        agendaIndex++;
                      });

                  } else {
                    if (agendaIndex >= (data.agenda[0].sessions.length - 1)) {
                      if (data.callback) {
                        data.callback();
                      }
                    }
                    agendaIndex++;
                  }
                }

            });
          }

            if (item.dateStart && item.dateEnd && !data.agenda[0].toDelete[item.id] && item.id && item.forUpdate) {

              body.id = item.id;
              body[data.type] = data.id;
              if (data.type == 'stand') {
                body['event'] = item.eventId;
                body["visibility"] = "stand_public";
              } else {
                body["visibility"] = "event_published";
              }
              this.dispatch('updateActivity', {
                body: body,
                thumbnail: item.thumbnail,
                removeImage: item.removeImage,
                callback: (response) => {
                  if (item.meeting && item.meetingType && item.meetingType.value != 'no_video' && response.data.body.id) {
                    this.dispatch('updateActivityMeeting', {
                      activityid: response.data.body.id,
                      body: {
                        url: meetingUrl && (meetingUrl != '#') ? meetingUrl : '',
                      }
                    });
                  } else if (!item.meeting && item.meetingType && item.meetingType.value != 'no_video' && response.data.body.id) {
                    this.dispatch('createActivityMeeting', {
                      activityid: response.data.body.id,
                      body: {
                        url: meetingUrl && (meetingUrl != '#') ? meetingUrl : '',
                      }
                    });
                  }

                  if (item.newStrings && item.newStrings.length) {

                    let locale = context.rootState.i18n.locale;
                    let strings = [];
                    item.newStrings.forEach((str) => {


                      let string = str;
                      string.ref = 'activity';
                      string.ref_id = response.data.body.id;
                      string.language = locale;

                      strings.push(string);

                    });

                    this.dispatch('postSingleString', strings)
                  }

                  if (item.oldStrings && item.oldStrings.length) {

                    let locale = context.rootState.i18n.locale;
                    let strings = [];
                    let os_i = 0;
                    item.oldStrings.forEach((str, index) => {

                      let string = str;
                      string.ref = 'activity';
                      string.ref_id = response.data.body.id;
                      string.language = locale;

                      strings.push(string);

                      this.dispatch('putSingleString', string)
                        .then(resp => {
                          if (os_i >= (item.oldStrings.length - 1)) {
                            if (agendaIndex >= (data.agenda[0].sessions.length - 1)) {
                              if (data.callback) {
                                data.callback();
                              }
                            }
                            agendaIndex++;
                          }
                          os_i++;

                        });

                    });

                  } else {
                    if (agendaIndex >= (data.agenda[0].sessions.length - 1)) {
                      if (data.callback) {
                        data.callback();
                      }
                    }
                    agendaIndex++;
                  }

                }

              });
            }

          if (item.dateStart && item.dateEnd && !data.agenda[0].toDelete[item.id] && item.id && !item.forUpdate) {
            if (agendaIndex >= (data.agenda[0].sessions.length - 1)) {
              if (data.callback) {
                data.callback();
              }
            }
            agendaIndex;
          }

        });

      }

    },

    sendStrings(context, data) {
      if (data.item.newStrings && data.item.newStrings.length) {

        let locale = context.rootState.i18n.locale;
        let strings = [];
        data.item.newStrings.forEach((str) => {
          let string = str;
          string.ref = data.ref;
          string.ref_id = data.ref_id;
          string.language = locale;
          strings.push(string);
        });


        this.dispatch('postSingleString', strings).then(resp => console.log('newstring_resp', resp));

      }

      if (data.item.oldStrings && data.item.oldStrings.length) {

        let locale = context.rootState.i18n.locale;
        let strings = [];
        data.item.oldStrings.forEach((str) => {

          let string = str;
          string.ref = data.ref;
          string.ref_id = data.ref_id;
          string.language = locale;
          strings.push(string);
          if (!data.item['newVersionCreated']) {
            this.dispatch('putSingleString', string).then(resp => console.log('pricings and tiers _oldstring_resp', resp));
          }
        });
        if (!!data.item['newVersionCreated']) {
          this.dispatch('postSingleString', strings).then(resp => console.log('newVersionstring_resp', resp));
        }
      }
    },

    /* PRICINGS */
    sendPricing(context, data) {
      if (!data.pricing) {
        return false;
      }

      if (data.pricing.list?.length) {
        data.pricing.list.forEach(item => {
          this.dispatch('createPricing', {
            body: item,
            callback: (response) => {
              if (response.data.statusCode == '200' && response.data.body.id) {
                this.dispatch('sendStrings', {
                  ref: 'pricing',
                  ref_id: response.data.body.id,
                  item: item
                });
              }
            }
          });
        });
      }

      if (data.pricing.exist?.length) {
        const existedPricingsToUpdate = data.pricing.exist.filter(pricing => pricing.edited);
        existedPricingsToUpdate.forEach(item => {
          item.tags = item.tagsList.map(tag => ({text: tag.text}));
          this.dispatch('updatePricing', {
            body: item,
            callback: (response) => {
              if (response.data.statusCode == '200' && response.data.body.id) {
                item['newVersionCreated'] = item.id !== response.data.body.id;
                this.dispatch('sendStrings', {
                  ref: 'pricing',
                  ref_id: response.data.body.id,
                  item
                });
              }
            }
          });
        });
      }

      if (data.pricing.toDelete?.length) {
        data.pricing.toDelete.forEach(item => {
          this.dispatch('removePricing', item);
        });
      }
    },

    async createPricing(context, data) {
      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/billing/event/${data.body.event}/pricing`,
        body: data.body,
        callback: (response) => {
          if (data.callback(response)) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {
        console.log(response);
      }).catch(err => console.log(err))
    },
    async updatePricing(context, data) {
      if (!data.body) {
        return false;
      }

      await this.dispatch('putApi', {
        url: `https://${apiUrl}/billing/event/${data.body.event}/pricing`,
        body: data.body
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => console.log(err))
    },
    async getPricing(context, data) {
      if (!data.id) {
        return false;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/billing/event/${data.id}/pricing`,
        body: data.body
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },
    async removePricing(context, data) {
      if (!data) {
        return false;
      }

      await this.dispatch('deleteApi', {
        url: `https://${apiUrl}/billing/event/${data.event}/pricing/${data.id}`,
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          return response;
        }
      }).catch(err => console.log(err))
    },

    async buyTicket(context, data) {
      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/billing/event/${data.body.event}/ticket`,
        body: data.body,
        callback: (response) => {
          if (data.callback(response)) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {

      }).catch(err => console.log(err))
    },


    async checkoutPaypal(context, data) {
      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/paypal`,
        body: data.body,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {

      }).catch(err => console.log(err))
    },

    /* CHAT */
    async createChat(context, data) {
      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/chat/${data.type}/${data.id}`,
        body: data.body,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {

      }).catch(err => console.log(err))
    },

    async createChatFromStandOwner(context, data) {
      if (!data.body) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/chat/event/${data.eventId}/stand/${data.standId}`,
        body: data.body,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {

      }).catch(err => console.log(err))
    },

    getChats(context, data) {
      if (!data.type) {
        return false;
      }

      this.dispatch('getApi', {
        url: `https://${apiUrl}/chat/${data.type}/${data.id}?type=${data.queryType}`,
        body: data.body
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    getChatsA(context, data) {
      if ( !data.type ) {
        return false;
      }

      return this.dispatch('getApi', {
        url: `https://${apiUrl}/chat/${data.type}/${data.id}?type=${data.queryType}`,
        body: data.body
      });
    },

    chatAction(context, data) {
      if (!data.action || !data.sid) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/chat/${data.sid}/${data.action}`,
        body: {},
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log(response);
          }
        }
      }).then(response => {

      }).catch(err => console.log(err))

    },
    chatAssignPersonnel(context, data) {
      if (!data.personnelId || !data.sid) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/chat/${data.sid}/assign/${data.personnelId}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))

    },
    chatUpdateUnreadCount(context, data) {
      if (!data.index || !data.sid) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/chat/${data.sid}/updateLastConsumedMessageIndex/${data.index}`,
        body: {},
        callback(response) {
          if (data.callback) {
            data.callback(response);
          }
        }
      }).then(response => {
      }).catch(err => console.log(err))
    },
    async getUserChatUnreadNum(context, data) {
      let query = '';
      if (data.eventId) {
        query = '?eventid=' + data.eventId;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/chat/unreadnumber${query}`,
        body: data.body,
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {

          const poolData = {
            UserPoolId: context.getters.getAmplifyInfo.aws_user_pools_id,
            ClientId: context.getters.getAmplifyInfo.aws_user_pools_web_client_id,
          };
          const userPool = new AWS.CognitoUserPool(poolData);
          const cognitoUser = userPool.getCurrentUser();
          cognitoUser.getSession((err, session) =>{
            const refresh_token = session.getRefreshToken();
            cognitoUser.refreshSession(refresh_token, (refErr, refSession) => {
              if (refErr) {
                throw refErr;
              }
              else{
                //this provide new accessToken, IdToken, refreshToken
                // you can add you code here once you get new accessToken, IdToken, refreshToken
              }
            });
          })
        }
      }).catch(err => {

        const poolData = {
          UserPoolId: context.getters.getAmplifyInfo.aws_user_pools_id,
          ClientId: context.getters.getAmplifyInfo.aws_user_pools_web_client_id,
        };
        const userPool = new AWS.CognitoUserPool(poolData);
        const cognitoUser = userPool.getCurrentUser();
        cognitoUser.getSession((err, session) =>{
          const refresh_token = session.getRefreshToken();
          cognitoUser.refreshSession(refresh_token, (refErr, refSession) => {
            if (refErr) {
              throw refErr;
            }
            else{
              //this provide new accessToken, IdToken, refreshToken
              // you can add you code here once you get new accessToken, IdToken, refreshToken
            }
          });
        })

       }
      )
    },
    getUserChats(context, data) {

      this.dispatch('getApi', {
        url: `https://${apiUrl}/chat/user?type=visitor`,
        body: data.body
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },


    getTwilioToken(context, data) {
      this.dispatch('getApi', {
        url: `https://${apiUrl}/chat/token`,
        body: data.body
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiGetUser(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/user/${data.id}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiUpdateUser(context, data) {
      return await this.dispatch('putApi', {
        url: 'https://' + apiUrl + '/user/' + data.id,
        body: data.body
      }).then(response => {

        this.dispatch('uploadBrandings', {
          id: response.data.body.id,
          brandings: data.branding,
          posttype: 'user',
          callback: (response) => {
            if (data.callback) {
              // queryObj.evtOthersQuery = true;
              // checkUpdateEnd(queryObj);
              data.callback(response);
            } else {
              console.log('updtusrres', response);
            }
          }
        });

      }).catch(err => console.log(err))
    },

    async apiGetCompany(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/company/${data.id}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiUpdateCompany(context, data) {
      return await this.dispatch('putApi', {
        url: 'https://' + apiUrl + '/company/' + data.id,
        body: data.body
      }).then(response => {

        this.dispatch('uploadBrandings', {
          id: response.data.body.id,
          brandings: data.branding,
          posttype: 'company',
          callback: (response) => {

            if (data.downloadables) {
              let dwnlNewQuery = false;
              let dwnlDelQuery = false;

              if (data.downloadables.new && data.downloadables.new.length) {
                this.dispatch('uploadFiles', {
                  id: data.id,
                  post_type: 'company',
                  files: data.downloadables.new,

                  callback: (resp) => {
                    dwnlNewQuery = true;
                    if (dwnlNewQuery && dwnlDelQuery) {
                      if (data.callback) {
                        data.callback(response);
                      }
                    }
                  }
                });
              } else {
                dwnlNewQuery = true;
                if (dwnlNewQuery && dwnlDelQuery) {
                  if (data.callback) {
                    data.callback(response);
                  } else {
                    console.log('updtusrres', response);
                  }
                }
              }

              if (data.downloadables.maps && Object.keys(data.downloadables.maps).length) {
                let i = 0;
                for (const fileId in data.downloadables.maps) {
                  if (!data.downloadables.maps[fileId]) {
                    /* delete_file */
                    console.log('delete file', fileId);
                    this.dispatch('deleteFile', {
                      id: fileId,
                      callback: (resp) => {
                        if (i == (Object.keys(data.downloadables.maps).length - 1)) {
                          dwnlDelQuery = true;
                          if (dwnlNewQuery && dwnlDelQuery) {
                            if (data.callback) {
                              data.callback(response);
                            } else {
                              console.log('updtusrres', response);
                            }
                          }
                        }
                        i++;

                      }
                    });
                  } else {
                    if (i == (Object.keys(data.downloadables.maps).length - 1)) {
                      dwnlDelQuery = true;
                      if (dwnlNewQuery && dwnlDelQuery) {
                        if (data.callback) {
                          data.callback(response);
                        } else {
                          console.log('updtusrres', response);
                        }
                      }
                    }
                    i++;
                  }
                }
              } else {
                dwnlDelQuery = true;
                if (dwnlNewQuery && dwnlDelQuery) {
                  if (data.callback) {
                    data.callback(response);
                  } else {
                    console.log('updtusrres', response);
                  }
                }
              }

            } else {
              if (data.callback) {
                data.callback(response);
              } else {
                console.log('updtusrres', response);
              }
            }

          }
        });

      }).catch(err => console.log(err))
    },

    async apiGetRoles(context, data) {
      /* data.type: company/event/stand */
      if (!data.type) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/role?type=${data.type}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiGetCompanyInvitations(context, data) {
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/company/personnelinvitations`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiCancelCompanyInvitation(context, data) {
      // https://apidev.{your-domain}/company/invitation/cancel/<confirmationId>
      if (!data.confirmationId) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/company/invitation/cancel/${data.confirmationId}`,
        body: {}
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },
    async apiGetCompanyUsers(context, data) {
      if (!data.companyId) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/company/${data.companyId}/personnel`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiUpdateCompanyUser(context, data) {
      // https://apidev.{your-domain}/company/upgrade/{userId}/{roleId}?position=New_position
      console.log('apiUpdateCompanyUser', data);
      let queryString = '';
      if (data.position) {
        queryString = '?position=' + data.position;
      }
      return await this.dispatch('putApi', {
        url: `https://${apiUrl}/company/upgrade/${data.userId}/${data.roleId}${queryString}`,
        body: {}
      }).then(response => {

        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiDeleteCompanyUser(context, data) {
      /*reason: message why you delete user*/
      if (!data.userId || !data.reason) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/company/removeuser/${data.userId}`,
        body: data
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },
    async apiGetPersonnel(context, data) {
      /* type: event/stand, typeId: eventId/standId */
      if (!data.companyId || !data.type || !data.typeId) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/${data.type}/${data.typeId}/personnel`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiAddPersonnel(context, data) {
      /* type: event/stand, typeId: eventId/standId */
      if (!data.userId || !data.roleId || !data.type || !data.typeId) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/company/${data.type}/${data.typeId}/${data.userId}/${data.roleId}`,
        body: data
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },

    async apiUpdatePersonnel(context, data) {
      /* type: event/stand, typeId: eventId/standId */
      // PUT /stand/{standid}/personnel/{userid}?roleid=11&position=top manager&public
      if (!data.userId || !data.roleId || !data.type || !data.typeId) {
        return false;
      }
      let query = '';
      if (data.position) {
        query += '&position=' + data.position;
      }
      if (data.public) {
        query += '&public=1';
      }
      this.dispatch('putApi', {
        url: `https://${apiUrl}/${data.type}/${data.typeId}/personnel/${data.userId}?roleid=${data.roleId}${query}`,
        body: data
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },

    async apiGetArticles(context, data) {
      /* type: stand/event/company, typeId: eventId/standId/companyId, status: ['draft', 'published', 'deleted'] (published by default)
        pageNum - page number for pagination(begin from 0), recordsPerPage - articles count for pagination
      */
      if (!data.type || !data.typeId) {
        return false;
      }
      let query = '';

      if (data.status || data.pageNum || data.recordsPerPage) {
        query = '?';
        if (data.status) {
          query += query == '?' ? 'status=' + data.status : '&status=' + data.status;
        }
        if (data.pageNum) {
          query += query == '?' ? 'pageNum=' + data.pageNum : '&pageNum=' + data.pageNum;
        }
        if (data.recordsPerPage) {
          query += query == '?' ? 'recordsPerPage=' + data.recordsPerPage : '&recordsPerPage=' + data.recordsPerPage;
        }
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/articles/${data.type}/${data.typeId}${query}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    apiGetArticlesA(context, data) {
      if (!data.type || !data.typeId) {
        return false;
      }
      let query = '';

      if (data.status || data.pageNum || data.recordsPerPage) {
        query = '?';
        if (data.status) {
          query += query == '?' ? 'status=' + data.status : '&status=' + data.status;
        }
        if (data.pageNum) {
          query += query == '?' ? 'pageNum=' + data.pageNum : '&pageNum=' + data.pageNum;
        }
        if (data.recordsPerPage) {
          query += query == '?' ? 'recordsPerPage=' + data.recordsPerPage : '&recordsPerPage=' + data.recordsPerPage;
        }
      }
      return this.dispatch('getApi', {
        url: `https://${apiUrl}/articles/${data.type}/${data.typeId}${query}`,
      })
    },
    async apiGetArticleById(context, data) {
      if (!data.id) {
        return false;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/article/${data.id}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiGetOpenArticleById(context, data) {
      if (!data.id) {
        return false;
      }

      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/open/article/${data.id}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiGetOpenArticles(context, data) {
      /* type: stand/event/company, typeId: eventId/standId/companyId, status: ['draft', 'published', 'deleted'] (published by default)
        pageNum - page number for pagination(begin from 0), recordsPerPage - articles count for pagination
      */
      if (!data.type || !data.typeId) {
        return false;
      }
      let query = '';

      if (data.status || data.pageNum || data.recordsPerPage) {
        query = '?';
        if (data.status) {
          query += query == '?' ? 'status=' + data.status : '&status=' + data.status;
        }
        if (data.pageNum) {
          query += query == '?' ? 'pageNum=' + data.pageNum : '&pageNum=' + data.pageNum;
        }
        if (data.recordsPerPage) {
          query += query == '?' ? 'recordsPerPage=' + data.recordsPerPage : '&recordsPerPage=' + data.recordsPerPage;
        }
      }
      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/open/articles/${data.type}/${data.typeId}${query}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },
    async apiDeleteArticle(context, data) {
      if (!data.id) {
        return false;
      }

      await this.dispatch('deleteApi', {
        url: `https://${apiUrl}/article/${data.id}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiAddArticle(context, data) {

      if (!data) {
        return false;
      }

      let article = data.articleData;

      this.dispatch('postApi', {
        url: `https://${apiUrl}/article`,
        body: data.articleData,
        callback: (response) => {
          this.dispatch('uploadArticleBrandings', {
            id: data.articleData.event,
            articleId: response.data.body.id,
            brandings: data.articleBranding,
            posttype: 'event',
            callback: (resp) => {
              if (data.callback) {
                data.callback(response);
              }
            }
          });
        }
      })

    },

    uploadArticleBrandings(context, data) {
      if (data.brandings && data.id && data.posttype) {

        let tcp = true;
        let bp = true;
        let urls = [];

        if (data.brandings.articleBanner && data.brandings.articleBanner.new && data.brandings.articleBanner.new.length) {

          if (data.brandings.maps.articleBanner) {
            this.dispatch('deleteFile', {
              id: data.brandings.maps.articleBanner,
            });
          }

          bp = false;

          this.dispatch('uploadFiles', {
            id: data.id,
            ref: 'news',
            ref_id: data.articleId,
            post_type: data.posttype,
            files: data.brandings.articleBanner.new,
            category: 'news',
            description: 'article_thumb',

            callback(url) {
              bp = true;
              urls[1] = url;
              if (bp && tcp && data.callback) {
                data.callback(urls);
              }
            },

          });
        } else if (data.brandings.articleBanner && data.brandings.articleBanner.todelete && data.brandings.maps.articleBanner) {
          this.dispatch('deleteFile', {
            id: data.brandings.maps.articleBanner,
          });
        }

        if (data.brandings.articleCover && data.brandings.articleCover.new && data.brandings.articleCover.new.length) {

          if (data.brandings.maps.articleCover) {
            this.dispatch('deleteFile', {
              id: data.brandings.maps.articleCover,
            });
          }

          tcp = false;

          this.dispatch('uploadFiles', {
            id: data.id,
            ref: 'news',
            ref_id: data.articleId,
            post_type: data.posttype,
            files: data.brandings.articleCover.new,
            category: 'news',
            description: 'article_banner',

            callback(url) {
              tcp = true;
              urls[0] = url;
              if (bp && tcp && data.callback) {
                data.callback(urls);
              }
            },

          });
        } else if (data.brandings.articleCover && data.brandings.articleCover.todelete && data.brandings.maps.articleCover) {
          this.dispatch('deleteFile', {
            id: data.brandings.maps.articleCover,
          });
        }

        if (bp && tcp && data.callback) {
          data.callback(urls);
        }


      } else {
        if (data.callback) {
          data.callback([]);
        }
      }

    },

    async apiUpdateArticle(context, data) {

      if (!data) {
        return false;
      }
      console.log(data);
      let article = data.articleData;

      this.dispatch('putApi', {
        url: `https://${apiUrl}/article/${data.articleData.id}`,
        body: data.articleData
      }).then(response => {
        this.dispatch('uploadArticleBrandings', {
          id: data.articleData.event,
          brandings: data.branding,
          articleId: response.data.body.id,
          posttype: 'event',
          callback: (resp) => {
            // if (data.callback) {

            // } else {
            console.log('updtevtres', response, resp);
            if (data.callback) {
              data.callback(resp);
            }
          }
        });
      }).catch(err => console.log(err))

    },
    async apiGetActivity(context, data) {
      /* type: stand/event/company, typeId: eventId/standId/companyId,
      expanded: if false - only 5 items returned, if true - return
      */
      if (!data.type || !data.typeId) {
        return false;
      }
      let query = '';

      if (data.expanded) {
        query = '?expanded=1';
      }
      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/activitystream/${data.type}/${data.typeId}${query}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiRequestDemo(context, data) {
      if (!data) {
        return false;
      }

      this.dispatch('postUApi', {
        url: `https://${apiUrl}/feedback`,
        body: data.request,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })

    },

    /* SPONSORS */
    async apiCreateTier(context, data) {
      if (!data || !data.body || !data.price) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/tier`,
        body: data.body,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })

    },

    async apiGetTiers(context, data) {
      if (!data || !data.eventId) {
        return false;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/event/${data.eventId}/tiers`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },

    async apiGetTiersForVisitors(context, data) {
      if (!data.eventId) {
        return false;
      }

      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/event/${data.eventId}/visitor/tiers`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },


    async apiUpdateTier(context, data) {
      if (!data || !data.body || !data.price) {
        return false;
      }

      this.dispatch('createPricing', {
        body: data.price,
        callback: (response) => {
          console.log('createPricing', response);
          if (response.data.statusCode == '200' && response.data.body.id) {
            this.dispatch('sendStrings', {
              ref: 'pricing',
              ref_id: response.data.body.id,
              item: data.price
            });
            data.body.pricing = response.data.body.id;
          }

          this.dispatch('putApi', {
            url: `https://${apiUrl}/tier`,
            body: data.body
          }).then(response => {
            if (data.callback) {
              data.callback(response);
            }
          }).catch(err => console.log(err))
        }
      });
    },

    async apiCreateSponsor(context, data) {
      if (!data || !data.eventId || !data.tierId) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/event/${data.eventId}/tiers/${data.tierId}`,
        body: {},
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    async getTierPricing(context, data) {
      if (!data.id) {
        return false;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/billing/tier/${data.id}/pricing`,
        body: data.body
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async getEventPromos(context, data) {
      if (!data.eventId) {
        return false;
      }

      let query = '';
      if (data.pagesQuery.length) {
        query = '?placeids=' + data.pagesQuery.join(',');
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/event/${data.eventId}/promos${query}`,
        body: data.body,
        errorsPass: [404]
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiPromoShowed(context, data) {
      if (!data || !data.eventId || !data.relationId || !data.placeId) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/sponsor/${data.relationId}/view/${data.placeId}`,
        body: {},
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    async apiGetSignedReportUrl(context, data) {
      if (!data || !data.eventCompanyId || !data.eventId || !data.objectRef || !data.objectRefId) {
        return false;
      }
      let typeString = '';
      if (data.type) {
        typeString = '-' + data.type;
      }
      this.dispatch('getApi', {
        url: `https://${apiUrl}/report/downloadURL?path=company/${data.eventCompanyId}/events/${data.eventId}/sponsor-data/event-${data.eventId}.sponsor-${data.objectRef}-${data.objectRefId}${typeString}.json`,
        body: {}
      }).then(response => {
        if (response.data.statusCode == '200' && response.data.body.url) {
          this.dispatch('getUApi', {
            url: response.data.body.url,
            body: {}
          }).then(response => {
            if (data.callback(response)) {
              data.callback(response);
            } else {
              console.log(response);
            }
          }).catch(err => console.log(err))
        } else {
          if (data.callback) {
            data.callback(response);
          }
        }
      }).catch(err => console.log(err))
    },

    async apiGetSignedVideoLink(context, data) {
      if (!data || !data.activityid || !data.url) {
        return false;
      }

      return this.dispatch('getApi', {
        url: `https://${apiUrl}/activity/${data.activityid}/downloadURL?path=${data.url}`,
        body: {}
      }).then(response => {
        if (response.data.statusCode === 200 && response.data.body.url) {
          return response.data.body.url;
        } else {
          return null;
        }
      }).catch(err => console.log(err))
    },

    async apiSponsorRefund(context, data) {
      if (!data || !data.id) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/sponsor/${data.id}/refund`,
        body: {},
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    async apiWatchPromo(context, data) {
      if (!data.url) {
        return false;
      }

      await this.dispatch('getApi', {
        url: data.url,
        body: {}
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => console.log(err))
    },

    async apiGetSponsorsByType(context, data) {
      /* data.type = [user, company] */
      if (!data.type || !data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/sponsored/${data.type}/${data.id}`,
        body: {}
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => console.log(err))
    },

    async apiGetEventVisitors(context, data) {
      /* data.type = [event, stand]; data.id = [eventId, standId] */
      if (!data.id || !data.type) {
        return false;
      }

      let query = '';
      if ((data.page || data.page === 0) && data.recordsPerPage) {
        query += query ? '&' : '?';
        query += `recordsPerPage=${data.recordsPerPage}&pageNum=${data.page}`;
      }
      if (data.search) {
        query += query ? '&' : '?';
        query += `searchby=${data.search}`;
      }

      if (data.onlyNumber) {
        query = '?onlyNumber=true';
      }

      if (data.status) {
        query += query ? '&' : '?';
        query += `status=${data.status}`;
      }

      await this.dispatch('getApi', {
        url: `https://${apiUrl}/${data.type}/${data.id}/attendees${query}`,
        body: {}
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => console.log(err))
    },
    async apiImportVisitors(context, data) {
      if (!data.id || !data.type) {
        return false;
      }

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/${data.type}/${data.id}/attendees`,
        body: data.file,
        contenttype: "text/csv",
        errorsPass: [405]
      }).then(response => {
        data.callback(response);
      }).catch(err => console.error(err));
    },
    async apiGetVisitorsListLink(context, data) {
      if (!data.companyId || !data.eventId) {
        return false;
      }

      this.dispatch('getApi', {
        url: `https://${apiUrl}/report/downloadURL?path=company/${data.companyId}/events/${data.eventId}/report/event-${data.eventId}.ticket-list.json`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },

    async apiTicketAction(context, data) {
      if (!data.ticketId || !data.action) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/ticket/${data.ticketId}/mgmt/${data.action}`,
        body: {},
        callback: (response) => {
          data.callback(response);
        }
      })
    },

    async confirmEmailAddress(context, data) {
      if (!data || !data.code || !data.userName || !data.clientId) {
        return false;
      }

      this.dispatch('postUApi', {
        url: `https://${apiUrl}/user/confirm`,
        body: {
          code: data.code,
          userName: data.userName,
          clientId: data.clientId
        },
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    async getCustomUsersField(context, data) {
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/user/customfields`,
        body: {}
      }).then(response => {
        if (data.callback(response)) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },

    async sendInvitation(context, data) {
      if (!data.type || !data.typeId || !data.roleId || !data.email || !data.position) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/${data.type}/${data.typeId}/invitation`,
        body: {
          text: data.text,
          useremail: data.email,
          roleid: data.roleId,
          position: data.position
        },
        callback: (response) => {
          data.callback(response);
        }
      })
    },

    async apiGetInvitations(context, data) {
      if (!data.type || !data.typeId) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/${data.type}/${data.typeId}/personnelinvitations`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiCancelInvitation(context, data) {
      if (!data.confirmationId) {
        return false;
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/invitation/cancel/${data.confirmationId}`,
        body: {}
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },

    async apiDeletePromo(context, data) {
      if (!data.relationId || !data.placeId) {
        return false;
      }
      this.dispatch('deleteApi', {
        url: `https://${apiUrl}/sponsor/${data.relationId}/action/${data.placeId}`
      })
        .then(response => {
          if (data.callback) {
            data.callback(response);
          } else {
            console.log('deleteFile', response);
          }
        })
        .catch(err => console.log(err));
    },

    async apiUpdateSponsor(context, data) {
      if (!data.id) {
        return false;
      }
      this.dispatch('putApi', {
        url: `https://${apiUrl}/sponsor/${data.id}`,
        body: data.body
      }).then(response => {
        data.callback(response);
      }).catch(err => console.log(err))
    },

    async apiGetLotteryData(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/sponsor/${data.id}/action/lottery`,
        body: {},
        errorsPass: [404]
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },


    async apiPutLotteryData(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('putApi', {
        url: `https://${apiUrl}/sponsor/${data.id}/action/lottery`,
        body: {
          prizeId: data.prizeId
        }
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiGetSurveyData(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/sponsor/${data.id}/action/survey`,
        body: {},
        errorsPass: [404]
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiPutSurveyData(context, data) {
      if (!data.id || !data.answers || !data.answers.length) {
        return false;
      }
      await this.dispatch('putApi', {
        url: `https://${apiUrl}/sponsor/${data.id}/action/survey`,
        body: {
          questions: data.answers
        }
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiGetStandAvaliablePersonnel(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/stand/${data.id}/reps`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => console.log(err))
    },

    async apiGetEventAvaliablePersonnel(context, data) {
      if (!data.id) {
        return false;
      }
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/event/${data.id}/reps`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiStandCreateMeeting(context, data) {
      if (!data.standId || !data.repid || !data.start || !data.end || !data.duration) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/stand/${data.standId}/meeting`,
        body: {
          representative: data.repid,
          start: data.start,
          end: data.end,
          meetingType: data.meetingType,
          value: {},
          visitor: data.visitor
        },
        callback: (response) => {
          if (data.subject && response.data.statusCode == '200') {
            let locale = context.rootState.i18n.locale;
            const strings = [
              {
                ref: 'activity',
                ref_id: response.data.body.activityId,
                language: locale,
                category: 'description_long',
                value: data.subject
              }
            ]
            this.dispatch('postApi', {
              url: 'https://' + apiUrl + '/strings',
              body: strings,
              callback: (resp) => {
                data.callback(response);
              }
            }).catch(err => console.log(err))
          } else {
            data.callback(response);
          }
        }
      }).then(response => {

        // data.callback(response);
      }).catch(err => console.log(err))
    },

    async acceptStandActivityMeeting(context, data) {

      if (!data.body) {
        return false;
      }

      await this.dispatch('putApi', {
        url: `https://${apiUrl}/stand/${data.standId}/meeting/${data.activityid}`,
        // body: data.body.activity
        body: {
          representative: data.repid,
          start: data.start,
          end: data.end,
          value: data.value,
          visitor: data.visitor
        }
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))

    },

    async apiSearch(context, data) {
      if (!data.id || !data.text) {
        return false;
      }

      let anotherParams = '';
      if (data.scope) {
        anotherParams += '&scope=' + data.scope;
      }
      if (data.start) {
        anotherParams += '&start=' + data.start;
      }
      if (data.page) {
        anotherParams += '&size=' + data.page;
      }
      if (data.stand) {
        anotherParams += '&' + data.stand;
      }

      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/search/${data.id}?q=${data.text}${anotherParams}`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }

      }).catch(err => console.log(err))
    },

    async apiCreatePersonnel(context, data) {
      let curData = {
        useremail: data.PersonnelData.useremail,
        roleid: data.PersonnelData.roleid,
        position: data.PersonnelData.position,
        username: data.PersonnelData.text,
        tags: data.PersonnelData.tags,
        public: data.PersonnelData.public
      }
      this.dispatch('postApi', {
        url: `https://${apiUrl}/${data.PersonnelData.type}/${data.PersonnelData.eventid}/personnel`,
        body: curData,
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    apiEditPersonnel(context, data) {

      let curData = {
        useremail: data.PersonnelData.useremail,
        roleid: data.PersonnelData.roleid,
        position: data.PersonnelData.position,
        username: data.PersonnelData.text,
        tags: data.PersonnelData.tags,
        public: data.PersonnelData.public,
        price: data.PersonnelData.price ? data.PersonnelData.price : 0
      }
      this.dispatch('putEditPers', {
        url: `https://${apiUrl}/${data.PersonnelData.type}/${data.PersonnelData.eventid}/personnel/${data.PersonnelData.id}`,
        body: curData,
      }).then(
        (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      )
    },

    async apiDeletePersonnel(context, data) {
      await this.dispatch('deleteApi', {
        url: `https://${apiUrl}/${data.PersonnelData.type}/${data.PersonnelData.eventid}/personnel/${data.PersonnelData.id}`,
        body: {
          requestBody: 'Reason of user removal',
        }
      })
        .then(response => {
          if (data.callback) {
            data.callback(response, 'data.callback')
          } else {
            console.log(response, 'response else');
          }
        })
        .catch(err => console.log(err));
    },

    async apiCreateStand(context, data) {
      if (!data.eventId || !data.name || !data.tags || !data.language) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/stand`,
        body: {
          eventId: data.eventId,
          name: data.name,
          tags: data.tags,
          language: data.language,
        },
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    async apiStandOperation(context, data) {
      if (!data.standId || !data.operation) {
        return false;
      }

      this.dispatch('postApi', {
        url: `https://${apiUrl}/stand/${data.standId}/mgmt/${data.operation}`,
        body: {},
        callback: (response) => {
          if (data.callback) {
            data.callback(response);
          }
        }
      })
    },

    async apiGetMyInvitations(context, data) {
      await this.dispatch('getApi', {
        url: `https://${apiUrl}/user/myinvitations`,
        body: {}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        }
      }).catch(err => console.log(err))
    },

    async apiGetDiscountInfo(context, data) {
      if (!data.discountHash) return false;

      await this.dispatch('getUApi', {
        url: `https://${apiUrl}/open/discount/${data.discountHash}`
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        }
      }).catch(err => console.log(err));
    },

    async apiGetCollections(context, data) {
      if (!data.eventId) return false;
      const id = data.standId || data.eventId;
      const prefix = data.standId ? 'stand' : 'event';

      let url = '';
      let apiType = '';
      if (data.user) {
        url = `https://${apiUrl}/${prefix}/${id}/collections`;
        apiType = 'getApi';
      } else {
        url = `https://${apiUrl}/open/${prefix}/${id}/collections`;
        apiType = 'getUApi';
      }

      return await this.dispatch(apiType, {
        url,
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          return response;
        }
      }).catch(err => console.log(err));
    },
    async apiCreateCollection(context, data) {
      const {eventId, body, standId} = data;
      if (!eventId || !body) return false;
      const id = standId || eventId;
      const prefix = standId ? 'stand' : 'event';

      await this.dispatch('postApi', {
        url: `https://${apiUrl}/${prefix}/${id}/collection`,
        body: {
          name: body.name,
          ref: body.ref,
          tags: body.tags,
          event: eventId,
          stand: standId,
          customName: body.customName,
        },
      }).then(async (response) => {
        if(response.data.statusCode !== 200){
          context.commit('setAgendaName',data.body.name)
          return false
        } else {

          if (body.newStrings?.length) {
          const locale = context.rootState.i18n.locale;
          const strings = body.newStrings.map(string => {
            return {
              ...string,
              ref: 'collection',
              ref_id: response.data.body.id,
              language: locale
            };
          });

          await this.dispatch('postSingleString', strings);
        }

        if (body.image?.length) {
          await this.dispatch('uploadFiles', {
            id: standId || eventId,
            ref: 'collection',
            ref_id: response.data.body.id,
            post_type: standId ? 'stand' : 'event',
            files: body.image,
            category: 'branding',
            description: 'collection_thumb',
          });
        }

        if (body.hero?.length) {
          await this.dispatch('uploadFiles', {
            id: standId || eventId,
            ref: 'collection',
            ref_id: response.data.body.id,
            post_type: standId ? 'stand' : 'event',
            files: body.hero,
            category: 'branding',
            description: 'collection_hero',
          });
        }
        router.push({
          name: router.app._route.name,
          params: { id: router.app._route.params.id,tabId: router.app._route.params.tabId }
        });
        }
      }).catch(err => console.log(`ERROR during collection create: ${err}`));
    },
    async apiUpdateCollectionById(context, data) {
      const {eventId, body, standId} = data;
      if (!eventId || !body || !body.id) return false;
      const id = standId || eventId;
      const prefix = standId ? 'stand' : 'event';

      return this.dispatch('putApi', {
        url: `https://${apiUrl}/${prefix}/${id}/collection/${body.id}`,
        body: {
          name: body.name,
          ref: body.ref,
          tags: body.tags,
          event: eventId,
          stand: standId,
          customName: body.customName,
        },
      }).then(async (response) => {
        if (body.newStrings?.length) {
          const locale = context.rootState.i18n.locale;
          const strings = body.newStrings.map(string => {
            return {
              ...string,
              ref: 'collection',
              ref_id: response.data.body.id,
              language: locale
            };
          });

          await this.dispatch('postSingleString', strings);
        }
        if (body.oldStrings?.length) {
          const locale = context.rootState.i18n.locale;
          const strings = body.oldStrings.map(string => {
            return {
              ...string,
              ref: 'collection',
              ref_id: response.data.body.id,
              language: locale
            };
          });

          await Promise.all(strings.map(string => {
            return this.dispatch('putSingleString', string);
          }));
        }

        if (body.image?.length) {
          const existedThumb = body.branding.find(item => item.url.indexOf('collection_thumb') > -1)
          if (existedThumb) {
            await this.dispatch('deleteFile', {
              id: existedThumb.id,
            });
          }

          await this.dispatch('uploadFiles', {
            id,
            ref: 'collection',
            ref_id: response.data.body.id,
            post_type: prefix,
            files: body.image,
            category: 'branding',
            description: 'collection_thumb',
          });
        }

        if (body.heroNew?.length) {
          const existedHero = body.branding.find(item => item.url.indexOf('collection_hero') > -1)
          if (existedHero) {
            await this.dispatch('deleteFile', {
              id: existedHero.id,
            });
          }

          await this.dispatch('uploadFiles', {
            id,
            ref: 'collection',
            ref_id: response.data.body.id,
            post_type: prefix,
            files: body.heroNew,
            category: 'branding',
            description: 'collection_hero',
          });
        }
      }).catch(err => console.log(`ERROR during collection update: ${err}`));
    },
    async getCollectionById(context, data) {
      if (!data.eventId || !data.collectionId) return false;
      const id = data.standId || data.eventId;
      const prefix = data.standId ? 'stand' : 'event';

      return this.dispatch('getApi', {
        url: `https://${apiUrl}/${prefix}/${id}/collection/${data.collectionId}`,
      }).catch(err => console.log(`ERROR during getting collection by id: ${err}`));
    },
    async apiDeleteCollectionById(context, data) {
      if (!data.eventId || !data.collectionId) return false;
      const id = data.standId || data.eventId;
      const prefix = data.standId ? 'stand' : 'event';

      return this.dispatch('deleteApi', {
        url: `https://${apiUrl}/${prefix}/${id}/collection/${data.collectionId}`,
      }).catch(err => console.log(`ERROR during collection delete: ${err}`));
    },
    async sendCollections(context, data) {
      const {collections, eventId, standId} = data;
      if (!eventId || (!collections.delete?.length && !collections.save?.length)) return false;

      // delete collections if there are any
      if (collections.delete?.length) {
        await Promise.all(collections.delete.map(collectionId => {
          return this.dispatch('apiDeleteCollectionById', {eventId, standId, collectionId});
        }));
      }

      if (collections.save?.length) {
        const collectionsToSave = collections.save.filter(collection => collection.new);
        const collectionsToUpdate = collections.save.filter(collection => !collection.new);

        // create new collections
        if (collectionsToSave.length) {
          await Promise.all(collectionsToSave.map(collection => {
            return this.dispatch('apiCreateCollection', {eventId, standId, body: collection});
          }));
        }

        // update existing collections
        if (collectionsToUpdate.length) {
          await Promise.all(collectionsToUpdate.map(collection => {
            return this.dispatch('apiUpdateCollectionById', {eventId, standId, body: collection});
          }));
        }
      }
    },
    async sendProducts(context, data) {
      const {products, eventId, standId} = data;
      if (!products || !products.length) return false;
      await Promise.all(products.map(product => {
        return this.dispatch('apiUpdateProductById', {eventId, standId, body: product});
      }));
    },
    async apiUpdateProductById(context, data) {
      const {eventId, body, standId} = data;
      if (!eventId || !body || !body.id) return false;

      if (body.priceTags?.length) {
        body.priceTags.forEach(tag => {
          if (tag.selected) {
            body.tags.push(tag.value);
          }
        });
      }
      return this.dispatch('putApi', {
        url: `https://${apiUrl}/binary/${body.id}`,
        body: {
          filename: body.name,
          description: body.description,
          filmLink:body.filmLink,
          tags: body.tags || [],
        },
      }).then(async (response) => {

        if (body.newStrings?.length) {
          const locale = context.rootState.i18n.locale;
          const strings = body.newStrings.map(string => {
            return {
              ...string,
              ref: 'upload',
              ref_id: body.id,
              language: locale
            };
          });

          await this.dispatch('postSingleString', strings);
        }

        if (body.oldStrings?.length) {

          const locale = context.rootState.i18n.locale;
          const strings = body.oldStrings.map(string => {
            return {
              ...string,
              ref: 'upload',
              ref_id: body.id,
              language: locale
            };
          });
          if(body.filmLink === ''){
            let filmLinkId ;
            body.strings.forEach(string => {
              if(string.category == 'email_content') {
                filmLinkId = string.id;
                this.dispatch('deleteSingleString', filmLinkId);
              }
            });
          }
          await Promise.all(strings.map(string => {
            return this.dispatch('putSingleString', string);
          }));
        }
      }).catch(err => console.log(`ERROR during collection update: ${err}`));
    },

    async apiEventUpdateAnnouncementById(context, data) {
      if (!data.eventId) {
        return false;
      }
      await this.dispatch('putApi', {
        url: `https://${apiUrl}/event/${data.eventId}/announcement`,
        body: {text: data.message}
      }).then(response => {
        if (data.callback) {
          data.callback(response);
        } else {
          console.log(response);
        }
      }).catch(err => {
        console.log('refreshed', err);
      })
    }
  },

  mutations: {},
  state: {},
  getters: {
    getTest(state) {
      return 'Hello'
    },
    getRecommenderList(state) {
      return state.recommenderList
    },
  }
}

