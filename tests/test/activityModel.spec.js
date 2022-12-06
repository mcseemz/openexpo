require('dotenv/config');
const { assert } = require('chai');
const SOT = require('../../lambdas/API/model/activity');
const { Client } = require('pg')
const testQueries = require('./testQueries');


const client = new Client({});

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

describe('activity model', function () {
    const sample = {};
    sample.language = 'en_GB';
    sample.getActivityFromDb_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName', 'meetingUrl', 'strings'];
    sample.getSimpleActivityFromDb_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName', 'meetingUrl'];
    sample.getActivityFromDbOrException_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName', 'meetingUrl', 'strings', 'timezone'];
    sample.getActivityForStandByMeeting_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName'];
    this.beforeAll(async function () {
        await client.connect();
        await testQueries.createRoles(client);
        //Arrange
        sample.creator = await testQueries.createPerson(client, "Creator", "Fox", "creatorOfActivity@somemail.com", 'active');
        sample.moderator = await testQueries.createPerson(client, "Moderator", "Fox", "moderatorOfActivity@somemail.com", 'active');
        sample.presenter = await testQueries.createPerson(client, "Presenter", "Fox", "presenterOfActivity@somemail.com", 'active');
        sample.company = await testQueries.createCompany(client, 'testActivityFoxCompany', 'testActivityFoxCompany@mail.com');

        sample.event = await testQueries.createEvent(client, 'fox-test-activity-two', sample.company.id,);
        sample.stand = await testQueries.createStand(client, sample.company.id, sample.event.id, sample.language);
        sample.meeting = await testQueries.createMeeting(client);
        sample.personnel = await testQueries.createPersonnel(client, sample.moderator.id, sample.stand.id, sample.company.id, sample.event.id, 'company-staff', 'Test position');
        sample.activity = await testQueries.createActivity(client, sample.stand.id, sample.event.id, sample.meeting.id, sample.creator, sample.moderator, sample.presenter, 'someeCustomName-12');
    });

    describe('getActivityFromDb', function () {
        it('should return object with specified keys by id(number)', async function () {
            const newActivity = await SOT.getActivityFromDb(client, sample.activity.id, sample.language);
            assert.isObject(newActivity);
            assert.hasAllKeys(newActivity, sample.getActivityFromDb_keys);
            assert.equal(newActivity.customName, sample.activity.custom_name);
        });

        it('should return object with specified keys by name(string)', async function () {
            const newActivity = await SOT.getActivityFromDb(client, sample.activity.custom_name, sample.language);
            assert.isObject(newActivity);
            assert.equal(newActivity.id, sample.activity.id);
        });

        it('should return null if not found', async function () {
            const newActivity = await SOT.getActivityFromDb(client, null, sample.language);
            assert.isNull(newActivity);
        });
    });

    describe('getActivityFromDbOrThrowException', function () {
        it('should return object with specified keys by id(number)', async function () {
            const newActivity = await SOT.getActivityFromDbOrThrowException(client, sample.activity.id, sample.language);
            assert.isObject(newActivity);
            assert.hasAllKeys(newActivity, sample.getActivityFromDbOrException_keys);
            assert.equal(newActivity.customName, sample.activity.custom_name);
        });
        it('should return object with specified keys by name(string)', async function () {
            const newActivity = await SOT.getActivityFromDbOrThrowException(client, sample.activity.custom_name, sample.language);
            assert.isObject(newActivity);
            assert.equal(newActivity.id, sample.activity.id);
        });
        it('should throw the exception if not found', async function () {
            const expectedError = { errorCode: 404, errorMessage: '404 Activity not found' };
            let result = {};
            try {
                await SOT.getActivityFromDbOrThrowException(client, null, sample.language);
            } catch (err) {
                result = err;
            }
            assert.deepEqual(result, expectedError);
        });
    });

    describe('getSimpleActivityFromDb', function () {
        it('should return object with specified keys by id(number)', async function () {
            const newActivity = await SOT.getSimpleActivityFromDb(client, sample.activity.id, sample.language);
            assert.isObject(newActivity);
            assert.hasAllKeys(newActivity, sample.getSimpleActivityFromDb_keys);
            assert.equal(newActivity.customName, sample.activity.custom_name);
        });

        it('should return object with specified keys by name(string)', async function () {
            const newActivity = await SOT.getSimpleActivityFromDb(client, sample.activity.custom_name, sample.language);
            assert.isObject(newActivity);
            assert.equal(newActivity.id, sample.activity.id);
        });

        it('should return null if not found', async function () {
            const newActivity = await SOT.getSimpleActivityFromDb(client, null, sample.language);
            assert.isNull(newActivity);
        });
    });

    describe('getActivitiesForEvent', function () {
        it('should find and return array of activities for given event', async function () {
            //Arrange
            const activity = await testQueries.createActivity(client, null, sample.event.id, null, sample.creator, sample.moderator, sample.presenter, 'simple-activity');
            //Act
            const result = await SOT.getActivitiesForEvent(client, sample.event.id, 'agenda', ['stand_public']);
            //Assert
            assert.isArray(result);
            assert.isTrue(result.some(el => el.id === activity.id));
        });
    });

    describe('getActivitiesForStand', function () {
        it('should find and return array of activities for given stand', async function () {
            //Act
            const result = await SOT.getActivitiesForStand(client, sample.stand.id, 'agenda', ['stand_public'], sample.language);
            //Assert
            assert.isArray(result);
            assert.isTrue(result.some(el => el.id === sample.activity.id));
        });
    });

    describe('getActivitiesUpcoming', function () {
        it('should find and return array of activities that starts within five minutes from now', async function () {
            //Arrange
            const x = new Date();
            const currentTimeZoneOffsetInHours = x.getTimezoneOffset();

            const stand = await testQueries.createStand(client, sample.company.id, sample.event.id, sample.language, 'published');
            await testQueries.createPersonnel(client, sample.moderator.id, stand.id, sample.company.id, sample.event.id, 'company-staff', 'Test position');
            const start = addMinutes(new Date(), currentTimeZoneOffsetInHours + 3); //+3 minutes - gap between now and activity starts
            const end = addMinutes(start, 60);
            const activity = await testQueries.createActivity(client, stand.id, sample.event.id, sample.meeting.id, sample.creator, sample.moderator, sample.presenter, 'upcoming-activity', start, end);
            //Act
            const result = await SOT.getActivitiesUpcoming(client, sample.event.id, SOT.AGENDA, ['event_published', 'stand_public', 'stand_promoted'], sample['language']);
            //Assert
            assert.isArray(result);
            assert.isTrue(result.some(el => el.id === activity.id));
        });
    });

    describe('getActivityForStandByMeetingOrThrowException', function () {
        it('should return object with specified keys', async function () {
            const newActivity = await SOT.getActivityForStandByMeetingOrThrowException(client, sample.stand.id, sample.meeting.id);
            assert.isArray(newActivity);
            assert.isAtLeast(newActivity.length, 1);
            assert.isTrue(newActivity.some(el => el.id === sample.activity.id));
            assert.hasAllKeys(newActivity[0], sample.getActivityForStandByMeeting_keys);
        });
        it('should throw the exception if not found', async function () {
            const expectedError = { errorCode: 404, errorMessage: '404 Activity not found' };
            let result = {};
            try {
                await SOT.getActivityForStandByMeetingOrThrowException(client, null, null);
            } catch (err) {
                result = err;
            }
            assert.deepEqual(result, expectedError);
        });
    });

    describe('getProposedActivitiesForMultipleEvents', function () {
        it('should return array containing four objects', async function () {
            //Arrenge
            const events = [];
            const event = await testQueries.createEvent(client, 'test-multiple-activities', sample.company.id);
            events.push(event.id);
            events.push(sample.event.id)
            const activities = [];
            activities.push(await testQueries.createActivity(client, null, event.id, null, sample.creator, sample.moderator, sample.presenter, 'multipleName-1', null, null, 'stand_proposed'));
            activities.push(await testQueries.createActivity(client, null, event.id, null, sample.creator, sample.moderator, sample.presenter, 'multipleName-2', null, null, 'stand_proposed'));
            activities.push(await testQueries.createActivity(client, null, event.id, null, sample.creator, sample.moderator, sample.presenter, 'multipleName-3', null, null, 'stand_proposed'));
            activities.push(await testQueries.createActivity(client, null, event.id, null, sample.creator, sample.moderator, sample.presenter, 'multipleName-4', null, null, 'stand_proposed'));
            //Act
            const result = await SOT.getProposedActivitiesForMultipleEvents(client, events, sample.language);
            //Assert
            assert.isArray(result);
            assert.lengthOf(result, 4);
        });
    });

    describe('createActivityInDb', function () {
        it('must create and return activity', async function () {
            //Arrange
            const x = new Date();
            const currentTimeZoneOffsetInHours = x.getTimezoneOffset();
            const start = addMinutes(new Date(), currentTimeZoneOffsetInHours);
            const end = addMinutes(start, 60);
            const params = {
                stand: null,
                meeting: null,
                start: start,
                end: end,
                value: { "enableQA": false, "attendees": [], "presenter": "", "enableChat": false, "meetingUrl": "", "meetingType": "no_video" },
                visibility: 'event_published',
                creator: sample.creator.id,
                tags: ["type:agenda", "test"],
                customName: 'test-creating-activity'
            };
            //Act
            const result = await SOT.createActivityInDb(client, params, sample.event.id, sample.creator.id);
            //Assert
            assert.isObject(result);
            assert.hasAllKeys(result, sample.getActivityFromDb_keys);
        });
    });

    describe('createDefaultSchedule', function () {
        it('should create two activities: for the first and last day of event', async function () {
            //Arrenge
            const start = addMinutes(new Date(), (new Date()).getTimezoneOffset());
            const end = addMinutes(start, 60*24*5);//five days
            const event = await testQueries.createEvent(client, 'fox-test-default-schedule-five-days', sample.company.id, start, end);
            event.dateStart = event.date_start;
            event.dateEnd = event.date_end;
            //Act
            await SOT.createDefaultSchedule(client, event, sample.creator.id);
            //Assert
            const result = await client.query({text: `SELECT * FROM activity WHERE event=$1`, values:[event.id]});
            assert.isArray(result.rows);
            assert.lengthOf(result.rows, 2);
        });
        it('should create four activities: for every day of event', async function () {
            //Arrenge
            const start = addMinutes(new Date(), (new Date()).getTimezoneOffset());
            const end = addMinutes(start, 60*24*3);//three days
            const event = await testQueries.createEvent(client, 'fox-test-default-schedule-three-days', sample.company.id, start, end);
            event.dateStart = event.date_start;
            event.dateEnd = event.date_end;
            //Act
            await SOT.createDefaultSchedule(client, event, sample.creator.id);
            //Assert
            const result = await client.query({text: `SELECT * FROM activity WHERE event=$1`, values:[event.id]});
            assert.isArray(result.rows);
            assert.lengthOf(result.rows, 3);
        });
    });

    //TODO Update
    // updateActivityById
    // updateVisibilityForStandActivity
    // attachMeeting
    // detachMeeting
    // proposeForPromotion

    //TODO Delete
    // deleteActivityById
    // deleteActivityByMeetingId

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});