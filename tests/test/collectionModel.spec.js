require('dotenv/config');
const { assert } = require('chai');
const SOT = require('../../lambdas/API/model/collection');
const { Client } = require('pg')
const testQueries = require('./testQueries');


const client = new Client({});

describe('collection model', function () {
    const sample = {};
    sample.language = 'en_GB';
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
        sample.eventManager = await testQueries.createPersonnel(client, sample.moderator.id, sample.stand.id, sample.company.id, sample.event.id, 'event-manager', 'Test position');
        sample.standSupport = await testQueries.createPersonnel(client, sample.moderator.id, sample.stand.id, sample.company.id, sample.event.id, 'stand-support', 'Test position');
        sample.activity = await testQueries.createActivity(client, sample.stand.id, sample.event.id, sample.meeting.id, sample.creator, sample.moderator, sample.presenter, 'someeCustomName-12');
    });
    
    describe('createCollectionInDb', function(){
        it('should create and return new collection for user with grants', async function(){
            //Arrange
            
            //Act
            
            //Assert

        });
    });
});