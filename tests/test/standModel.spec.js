require('dotenv/config');
const { assert } = require('chai');
const SOT = require('../../lambdas/API/model/stand');
const { Client } = require('pg')
const testQueries = require('./testQueries');


const client = new Client({});

describe('stand model', function () {
    const sample = {};
    sample.language = 'en_GB';
    sample.getActivityFromDb_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName', 'meetingUrl', 'strings'];
    sample.getSimpleActivityFromDb_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName', 'meetingUrl'];
    sample.getActivityFromDbOrException_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName', 'meetingUrl', 'strings', 'timezone'];
    sample.getActivityForStandByMeeting_keys = ['id', 'stand', 'event', 'meeting', 'start', 'end', 'value', 'visibility', 'creator', 'records', 'tags', 'customName'];
    this.beforeAll(async function () {
        await client.connect();
        await testQueries.createRoles(client);
    });

    describe('createStandInDb', function () {
        it('should create and return new stand', async function () {
            //Arrange
            const company = await testQueries.createCompany(client, 'testStandFoxCompany', 'testStandFoxCompany@mail.com');
            const event = await testQueries.createEvent(client, 'fox-test-stand-two', company.id);
            const language = 'en_GB';
            const creator = await testQueries.createPerson(client, "Creator", "Fox", "creatorOfStand@somemail.com", 'active');
            const customName = 'stand-one-custom-name';
            const tags = ['fox-one', 'test-custom-name'];
            const status = 'draft';
            const video = parameter = '';
            //Act
            const result = await SOT.createStandInDb(client, company['id'], event['id'], language, creator['id'], customName, tags, status, video, parameter);
            //Assert
            assert.isObject(result);
            assert.hasAnyKeys(result, ['customName']);

            sample.custom_name = result['customName'];
            sample.id = result['id'];
        });
    });

    describe('getStandFromDb', function () {
        it('should return stand with specified keys by id(number)', async function () {
            //Act
            const result = await SOT.getStandFromDb(client, sample.id);
            //Assert
            assert.isObject(result);
            assert.equal(result.customName, sample.custom_name);
        });

        it('should return stand with specified keys by custom name(string)', async function () {
            //Act
            const result = await SOT.getStandFromDb(client, sample.custom_name);
            //Assert
            assert.isObject(result);
            assert.equal(result.id, sample.id);
        });

        it('should return null if not found', async function () {
            //Act
            const result = await SOT.getStandFromDb(client, null, sample.language);
            //Assert
            assert.isNull(result);
        });
    });

    describe('getStandFromDbOrThrowException', function () {
        it('should return object with specified keys by id(number)', async function () {
            //Act
            const result = await SOT.getStandFromDbOrThrowException(client, sample.id);
            //Assert
            assert.isObject(result);
            assert.equal(result.customName, sample.custom_name);
        });
        it('should return object with specified keys by name(string)', async function () {
            //Act
            const result = await SOT.getStandFromDbOrThrowException(client, sample.custom_name);
            //Assert
            assert.isObject(result);
            assert.equal(result.id, sample.id);
        });
        it('should throw the exception if not found', async function () {
            //Arrange
            const expectedError = { errorCode: 404, errorMessage: '404 Stand not found' };
            let result = {};
            //Act
            try {
                await SOT.getStandFromDbOrThrowException(client, null);
            } catch (err) {
                result = err;
            }
            //Assert
            assert.deepEqual(result, expectedError);
        });
    });

    describe('updateStandInDbOrThrowException', function (){
        it('should update existing stand with new custom name and status', async function () {
            //Arrange
            const updatedStand = Object.assign({}, await SOT.getStandFromDb(client, sample.id));
            updatedStand.customName = 'updated_'+updatedStand.customName;
            updatedStand.status = 'published';
            //Act
            const result = await SOT.updateStandInDbOrThrowException(client, updatedStand);
            //Assert
            assert.isObject(result);
            assert.equal(result.customName, updatedStand.customName);
            assert.equal(result.status, updatedStand.status);
        });
    })

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});