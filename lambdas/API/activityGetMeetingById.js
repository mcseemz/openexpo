/**
 * @description Get meeting for a given activity.
 * @class activityGetMeetingById
 */
 const validator = require('./model/validation');
 const meetingUtils = require('./model/meeting');
 const activityUtil = require('./model/activity');
 const poolUtil = require('./model/pool');
 const util = require('./model/util');
 const exceptionUtil = require('./model/exception');
 const personUtil = require('./model/person');
 const permissionUtil = require('./model/permissions');
 const eventUtil = require('./model/event');
 
 function validateParams(params) {
   return !!params['activityId'] && validator.isNumber(params['activityId']) &&
       !!params['language'] && validator.isValidLanguage(params['language']);
 }
 
 exports.handler = async function (data, context) {
   util.handleStart(data, 'lambdaActivityGetMeetingById');
 
   let client = util.emptyClient;
   try {
     if (!validateParams(data)) {
       throw new exceptionUtil.ApiException(405, 'Invalid parameters supplied');
     }
 
     client = await poolUtil.initPoolClientByOrigin(data['origin'], context);
 
     const activity = await activityUtil.getActivityFromDbOrThrowException(client, data['activityId'], data['language']);
 
     if (!activity['meeting']) {
       throw new exceptionUtil.ApiException(404, 'Meeting not found');
     }
     
     const user = await personUtil.getPersonFromDB(client, data['context']['email']);
    //check if ticket exist (not for non-active), or personnel or sponsor
    const {letmein} = user
      ? await eventUtil.checkCanUserViewEvent(client, activity['event'], user['id'], user['email'])
      : {letmein: false, isUserSponsor: false, isUber: false};

    if (!letmein) {
      throw new exceptionUtil.ApiException(403, 'No permission to access the meeting');
    }

    //check for permissions to view activity
    if (!(await permissionUtil.assertUserHasTicketWithAccessToContent(client, user['id'], activity['event'], activity['stand'], activity['tags']))) {
      throw new exceptionUtil.ApiException(403, 'You are not allowed to view this content');  
    }

     const meeting = await meetingUtils.getMeetingFromDb(client, activity['meeting']);
     meeting['activityId'] = activity['id'];
     
     const meetingType = activity.value ? activity.value.meetingType : '';
     if (meetingType === 'zoom') {
       const attendees = activity.value ? activity.value.attendees : [];
       meeting['zoom-credentials'] = await meetingUtils.getZoomCredentials(meeting['url'], attendees, user['id']);
     }
     
     return util.handle200(data, meeting);
   } catch (err) {
     return util.handleError(data, err);
   } finally {
     util.handleFinally(data, client);
   }
 };
 