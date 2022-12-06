require('dotenv/config');
const { assert, expect } = require('chai');
const { Client } = require('pg');
const SUT = require('../../lambdas/API/model/person');
const personnelTest = require('./personnelModel.spec');
const exceptionUtil = require('../../lambdas/API/model/exception');
const testQueries = require('./testQueries');

describe("person model", function () {
    const client = new Client({});

    this.beforeAll(async function () {
        await client.connect();
        testQueries.createRoles(client);
    });

    describe('getPersonFromDB', function () {
        it("should return person by email and person has 'fields' and 'tags' keys because 'itsMe", async function () {
            //Arrange
            const sample = {};
            sample.company = await testQueries.createCompany(client);
            sample.user = await SUT.createUserInDb(client, { email: 'somemail@mail.com', name: 'John', surname: 'Doe' });
            sample.personnel = await personnelTest.assignUserToCompanyAndReturn(client, sample.user.id, sample.company.id);
            //Act
            const person = await SUT.getPersonFromDB(client, sample.user.email, true);
            //Assert
            assert.isObject(person);
            assert.containsAllKeys(person, ["fields", "tags"]);
        });
        it("should return person by email and person has no 'fields' and 'tags'", async function () {
            //Arrange
            const sample = {};
            sample.company = await testQueries.createCompany(client);
            sample.user = await SUT.createUserInDb(client, { email: 'mail@rambler.com', name: 'Jane', surname: 'Doe' });
            sample.personnel = await personnelTest.assignUserToCompanyAndReturn(client, sample.user.id, sample.company.id);
            //Act
            const person = await SUT.getPersonFromDB(client, sample.user.email, false);
            //Assert
            assert.isObject(person);
            assert.doesNotHaveAnyKeys(person, ["fields", "tags"]);
        });
    });

    describe('getPersonById', function () {
        it("should return person object by user id", async function(){
            //Arrange
            const sample = {};
            sample.company = await testQueries.createCompany(client);
            sample.user = await SUT.createUserInDb(client, { email: 'test@yahoo.com', name: 'Jacki', surname: 'Tchan' });
            sample.personnel = await personnelTest.assignUserToCompanyAndReturn(client, sample.user.id, sample.company.id);     
            //Act
            const person = await SUT.getPersonById(client, sample.user.id);
            //Assert
            assert.isObject(person);
            assert.equal(person.id, sample.user.id);
        });
    });

    describe('getPersonByIdOrThrowException', function(){
        it('should return person', async function(){
            //Arrange
            const sample = {};
            sample.company = await testQueries.createCompany(client);
            sample.user = await SUT.createUserInDb(client, { email: 'test2@yahoo.com', name: 'Robert', surname: 'Niro' });
            sample.personnel = await personnelTest.assignUserToCompanyAndReturn(client, sample.user.id, sample.company.id);       
            //Act
            const person = await SUT.getPersonByIdOrThrowException(client, sample.user.id);
            //Assert
            assert.isObject(person);
            assert.equal(person.id, sample.user.id);            
        });
        it('should throw exception', async function(){
            //Arrange
            let result;
            const unrealNumber = 777;
            const error = new exceptionUtil.ApiException(405, 'User not registered');
            //Act
            try{
                result = await SUT.getPersonByIdOrThrowException(client, unrealNumber);
            }catch(err){
                result = err;
            }
            //Assert
            assert.deepEqual(result, error);            
        });
    });

    describe('getCompanyOwnersOrThrowException', function(){
        it('should return company owner', async function(){
            //Arrange
            const sample = {};
            sample.company = await testQueries.createCompany(client);
            sample.user = await SUT.createUserInDb(client, { email: 'xabcd@yahoo.com', name: 'John', surname: 'Wick' });     
            sample.personnel = await personnelTest.assignUserToCompanyAndReturn(client, sample.user.id, sample.company.id);
            //Act
            const owners = await SUT.getCompanyOwnersOrThrowException(client, sample.company.id);
            //Assert
            assert.isArray(owners);
            assert.equal(owners[0].id, sample.user.id);
                
        });
        it('should throw exception',async function(){
            //Arrange
            const unrealNumber = 999;
            const error = new exceptionUtil.ApiException(404, 'Company owners not found');
            //Act
            let result;
            try{
                result = await SUT.getCompanyOwnersOrThrowException(client, unrealNumber);
            }catch(err){
                result = err;
            };
            //Assert
            assert.deepEqual(result, error);
        });
    });

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});
