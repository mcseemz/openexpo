require('dotenv/config');
const chai = require('chai');
const assert = chai.assert; 
const expect = chai.expect;
chai.use(require('chai-as-promised'));

const { Pool, Client } = require('pg');
const SUT = require('../../lambdas/API/model/validation');
const testQueries = require('./testQueries');

const client = new Client({});

describe('validation model', function () {
    //Arrange
    const sample = {};
    const today = new Date();
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    const tomorrow = new Date(today);
    const yesterday = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    yesterday.setDate(yesterday.getDate() - 1);

    this.beforeAll(async function () {
        await client.connect();
        await testQueries.createRoles(client);
        //Arrange
        sample.creator = await testQueries.createPerson(client, "Creator", "Fox", "creatorOfActivity@somemail.com", 'active');
        sample.moderator = await testQueries.createPerson(client, "Moderator", "Fox", "moderatorOfActivity@somemail.com", 'active');
        sample.presenter = await testQueries.createPerson(client, "Presenter", "Fox", "presenterOfActivity@somemail.com", 'active');
        sample.company = await testQueries.createCompany(client, 'testActivityFoxCompany', 'testActivityFoxCompany@mail.com');
    });

    describe('isTodayOrInFuture', function () {
        it(`should return true for ${tomorrow.toLocaleDateString()} (tomorrow)`, async function () {
            //Act
            const result = SUT.isTodayOrInFuture(tomorrow);
            //Assert
            assert.isBoolean(result);
            assert.isTrue(result);
        });
        it(`should return true for ${today.toLocaleDateString()} (end of today)`, async function () {
            //Act
            const result = SUT.isTodayOrInFuture(endOfToday);
            //Assert
            assert.isBoolean(result);
            assert.isTrue(result);
        });
        it(`should return false for ${yesterday.toLocaleDateString()} (yesterday)`, async function () {
            //Act
            const result = SUT.isTodayOrInFuture(yesterday);
            //Assert
            assert.isBoolean(result);
            assert.isFalse(result);
        });
    });

    describe('isTodayOrInPast', function () {
        it(`should return false for ${tomorrow.toLocaleDateString()} (tomorrow)`, async function () {
            //Act
            const result = SUT.isTodayOrInPast(tomorrow);
            //Assert
            assert.isBoolean(result);
            assert.isFalse(result);
        });
        it(`should return true for ${today.toLocaleDateString()} (today)`, async function () {
            //Act
            const result = SUT.isTodayOrInPast(today);
            //Assert
            assert.isBoolean(result);
            assert.isTrue(result);
        });
        it(`should return true for ${yesterday.toLocaleDateString()} (yesterday)`, async function () {
            //Act
            const result = SUT.isTodayOrInPast(yesterday);
            //Assert
            assert.isBoolean(result);
            assert.isTrue(result);
        });
    });

    describe('getValidCustomNameOrThrowException', function () {
        it('should return the passed name (new-cutom-name-for-validation-test)', async function(){
            //Act
            const result = await SUT.getValidCustomNameOrThrowException(client, 'new-cutom-name-for-validation-test');
            //Assert
            assert.isString(result);
            assert.strictEqual(result, 'new-cutom-name-for-validation-test');
        });
        it('should return the new generated name for custom name string length 0', async function(){
            //Act
            const result = await SUT.getValidCustomNameOrThrowException(client, '');
            //Assert
            assert.isString(result);
            assert.match(result, /.*-gen/);
        });
        it('should return the new generated name for custom name null', async function(){
            //Act
            const result = await SUT.getValidCustomNameOrThrowException(client, null);
            //Assert
            assert.isString(result);
            assert.match(result, /.*-gen/);
        });
        it('should throw an error for given empty name with length greater than zero', async function(){
            //Assert
            await expect(SUT.getValidCustomNameOrThrowException(client, '   ')).to.be.rejectedWith({errorCode:405, errorMessage:'Custom name not available'});
        });
        it('should throw an error for given name consisted only from restricted symbols', async function(){
            //Assert
            await expect(SUT.getValidCustomNameOrThrowException(client, ':: ')).to.be.rejectedWith({errorCode:405, errorMessage:'Custom name not available'});
        });
        it('should throw an error for given name which is already used in the database', async function(){
            //Arrange
            const customName = 'validationTestCustomNameAlreadyInUse';
            await testQueries.createEvent(client, customName, sample.company.id);            
            //Assert
            await expect(SUT.getValidCustomNameOrThrowException(client, customName)).to.be.rejectedWith({errorCode:405, errorMessage:'Custom name not available'});
        });  
    });
    
    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});