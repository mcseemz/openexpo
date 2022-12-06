require('dotenv/config');
const { assert } = require('chai');
const SOT = require('../../lambdas/API/model/customname');
const { Client } = require('pg')
const testQueries = require('./testQueries');
const slugify = require('slugify');
const util = require('../../lambdas/API/model/util');

const client = new Client({});

describe('custom name model', function(){
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
    });
    describe('customNameIsAvailable', function () {
        it('should return true if given unique custom name for event', async function (){
            //Arrange
            const customName = 'testCustomNameOnTwoThree';
            //Act
            const result = await SOT.customNameIsAvailable(client, customName);
            //Assert
            assert.isBoolean(result);
            assert.isTrue(result);
        });
        it('should return false if custom name for event is used', async function (){
            //Arrange
            const customName = 'testCustomNameOnTwoThree';
            await testQueries.createEvent(client, customName, sample.company.id);
            //Act
            const result = await SOT.customNameIsAvailable(client, customName);
            //Assert
            assert.isBoolean(result);
            assert.isFalse(result);
        });
    });
    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});