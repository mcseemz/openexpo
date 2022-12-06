require('dotenv/config');
const { assert } = require('chai');
const { Client } = require('pg');
const personUtil = require('../../lambdas/API/model/person');
const eventUtil = require('../../lambdas/API/model/event');
const standUtil = require('../../lambdas/API/model/stand');
const ticketUtil = require('../../lambdas/API/model/ticket');
const stringUtils = require('../../lambdas/API/model/strings');
const SUT = require('../../lambdas/API/model/eventPricing');
const testQueries = require('./testQueries');

describe('pricing model', function(){
    const client = new Client({});

    this.beforeAll(async function () {
        await client.connect();
        testQueries.createRoles(client);
    });

    describe('getting localized strings for pricing', function(){
        it('should return email content',  async function(){
            //Arrenge
            const sampleLanguage = "en_GB";
            const sampleCategory = 'email_content';
            const sampleEmailContent = 'some dummy text in english';
            const sampleCompany = await testQueries.createCompany(client);
            const sampleEvent = await testQueries.createEvent(client, 'test-event-for-email-content', sampleCompany.id);
            const samplePricing = await testQueries.createPricing(client, sampleEvent.id,'sponsorship_price', 25, 'USD', 1, true);
            await testQueries.createStringsForEntity(client, 'pricing', samplePricing.id, sampleCategory, sampleLanguage, sampleEmailContent, false);
            //Act
            const pricing = await SUT.getPricingByIdOrThrowException(client, samplePricing.id);
            let pricingStrings = await stringUtils.getStringsForEntity(client, 'pricing', pricing['id'], sampleLanguage);
            if (typeof(pricingStrings)==='object'){
                pricingStrings = [pricingStrings];
            }        
            let customMessage = pricingStrings.find(s => s['category'] === sampleCategory);
            customMessage = customMessage ? customMessage['value'] : '';
            //Assert
            assert.equal(customMessage, sampleEmailContent);
        });
    });

    describe('updating event pricing', function(){
        it('should disable current version and create new',  async function(){
            //Arrenge
            const sampleCompany = await testQueries.createCompany(client, 'testPricing Company', 'testPricingcompany@mail.ua');
            const sampleAdmin = await testQueries.createPerson(client, 'Pricing', 'Admin', 'test_pricing_update_admin@gmail.ru');
            const sampleEvent = await testQueries.createEvent(client, 'test-event-for-pricing-update', sampleCompany.id);
            const sampleUser =await testQueries.createPersonnel(client, sampleAdmin.id, null, sampleCompany.id, sampleEvent.id,'company-staff', 'Test updating position');
            const samplePricing = await testQueries.createPricing(client, sampleEvent.id,'split_ticket_price', 25, 'USD', 1, true);
            const buyer = await testQueries.createPerson(client, 'Some', 'Buyer', 'somebuyer@gmail.ru');
            const buyerTwo = await testQueries.createPerson(client, 'Another', 'Buyer', 'somebuyer2@gmail.ru');
            ticketUtil.createTicketInDb(client, {event: sampleEvent.id, buyer:buyer.id,pricing: samplePricing.id, payment_status: 'payed', tags:['pricingTest']});
            ticketUtil.createTicketInDb(client, {event: sampleEvent.id, buyer:buyerTwo.id,pricing: samplePricing.id, payment_status: 'payed', tags:['pricingTest']});
            const eventPricingsBefore = await SUT.getAllPricingForEvent(client, sampleEvent.id);
            const pricingCopy = Object.assign({}, samplePricing);
            pricingCopy.quantity = 50;            
            //Act
            if (!pricingCopy['is_enabled'] && samplePricing['is_enabled'] !== pricingCopy['is_enabled']) {
              const eventPricing = await testQueries.getAllPricingForEvent(client, pricingCopy['event']);
              const activeCounter = eventPricing.reduce((total, val) => total + (val.is_enabled ? 1 : 0), 0);     
        
              if (activeCounter <= 1) {
                throw new exceptionUtil.ApiException(403, 'should be at least one active pricing for event');
              }
            }
            
            const fetchResult = await SUT.fetchPricingIsRemovable(client, [pricingCopy['id']]); 
            is_removable = fetchResult.length ? fetchResult[0].is_removable:false;
            let updatedEventPricing;
            let tickets = 0;
            if (is_removable){
              updatedEventPricing = await SUT.updatePricingInDb(client, pricingCopy);
            }else{
              await SUT.deprecatePreviousPricings(client, samplePricing);
              tickets = await SUT.getTicketNumForPricingById(client, pricingCopy['id']);
              pricingCopy['version'] = samplePricing['version'] || [];
              pricingCopy['version'].push({id:samplePricing.id,  tickets: tickets.length, user:sampleUser.id, date:new Date()});
              updatedEventPricing = await SUT.createPricingInDb(client, pricingCopy);
            }
            const eventPricingsAfter = await testQueries.getAllPricingForEvent(client, sampleEvent.id);
            //Assert
            assert.lengthOf(eventPricingsBefore, 1);
            assert.lengthOf(eventPricingsAfter, 2);
            assert.equal(tickets, 2);
        });
    });    

    describe('get active pricing for event', function(){
      it('should return empty array for event with no pricing added', async function(){
        //Arrenge
        const sampleCompany = await testQueries.createCompany(client, 'testEmptyActivePricingCompany', 'testPricingcompany@mail.ua');
        const sampleEvent = await testQueries.createEvent(client, 'test-event-for-empty-pricing-getting', sampleCompany.id);       
        //Act
        const result = await SUT.getActivePricingForEvent(client, sampleEvent.id);
        //Assert
        assert.isArray(result);
        assert.lengthOf(result, 0);
      });
      it('should return array of length equal to count of added active чpricings for event', async function(){
        //Arrenge
        const sampleCompany = await testQueries.createCompany(client, 'testAddedSomeActivePricingCompany', 'testAddedSomePricingcompany@mail.ua');
        const sampleEvent = await testQueries.createEvent(client, 'test-event-for-active-pricing-adding', sampleCompany.id);       
        const addedCount = 3;
        for (let i = 0; i <addedCount; i++){
          await testQueries.createPricing(client, sampleEvent.id,'split_ticket_price', 25+i, 'USD', 1, true);
        }
        await testQueries.createPricing(client, sampleEvent.id,'split_ticket_price', 22, 'USD', 1, false);
        //Act
        const result = await SUT.getActivePricingForEvent(client, sampleEvent.id);
        //Assert
        assert.isArray(result);
        assert.lengthOf(result, addedCount);
      });
    });

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});