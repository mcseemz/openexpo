ALTER TYPE dictionary_category_type ADD VALUE IF NOT EXISTS 'profilefield';
ALTER TYPE dictionary_category_type ADD VALUE IF NOT EXISTS 'profilerole';
ALTER TYPE dictionary_category_type ADD VALUE IF NOT EXISTS 'profileindustry';
ALTER TYPE dictionary_category_type ADD VALUE IF NOT EXISTS 'activity';

create or replace function add_custom_field(fieldName text, lang text, fancyName text, fieldType text, validation text, length integer, isDefault boolean) returns void
as $$
declare
    v int;
begin
    select id from dictionary where category = 'profilefield'::dictionary_category_type and value = fieldName into v;
    if not found then
        insert into dictionary (category, value) VALUES ('profilefield'::dictionary_category_type, fieldName) returning id into v;
    end if;

    insert into strings (ref, ref_id, category, language, value, is_default) VALUES ('dictionary', v, 'name', lang, fancyName, isDefault);
    insert into strings (ref, ref_id, category, language, value, is_default) VALUES ('dictionary', v, 'description_long', lang, '{"type":"' || fieldType ||'", "validation":"' || validation || '", "len": ' || length || '}', isDefault);
end
$$ language plpgsql;

create or replace function add_dictionary_item(categoryName text, fieldName text, lang text, fancyName text, isDefault boolean)  returns void
as $$
declare
    v int;
begin
    select id from dictionary where category = categoryName::dictionary_category_type and value = fieldName into v;
    if not found then
        insert into dictionary (category, value) VALUES (categoryName::dictionary_category_type, fieldName) returning id into v;
    end if;

    insert into strings (ref, ref_id, category, language, value, is_default) VALUES ('dictionary', v, 'name', lang, fancyName, isDefault);
end
$$ language plpgsql;

--add Profile Roles
select add_dictionary_item('profilerole', 'CLevel', 'en_GB', 'C-Level', true);
select add_dictionary_item('profilerole', 'Sales', 'en_GB', 'Sales', true);
select add_dictionary_item('profilerole', 'Vendor', 'en_GB', 'Vendor', true);
select add_dictionary_item('profilerole', 'Buyer', 'en_GB', 'Buyer', true);
select add_dictionary_item('profilerole', 'KnowledgeExpert', 'en_GB', 'Knowledge expert', true);
select add_dictionary_item('profilerole', 'Evangelist', 'en_GB', 'Evangelist', true);
select add_dictionary_item('profilerole', 'Enthusiast', 'en_GB', 'Enthusiast', true);
select add_dictionary_item('profilerole', 'Bystander', 'en_GB', 'Bystander', true);
select add_dictionary_item('profilerole', 'Other', 'en_GB', 'Other', true);

--add Profile Industry
select add_dictionary_item('profileindustry', 'Accounting', 'en_GB', 'Accounting', true);
select add_dictionary_item('profileindustry', 'AdministrationOfficeSupport', 'en_GB', 'Administration & Office Support', true);
select add_dictionary_item('profileindustry', 'AdvertisingArtsMedia', 'en_GB', 'Advertising, Arts & Media', true);
select add_dictionary_item('profileindustry', 'BankingFinancialServices', 'en_GB', 'Banking & Financial Services', true);
select add_dictionary_item('profileindustry', 'CallCentreCustomerService', 'en_GB', 'Call Centre & Customer Service', true);
select add_dictionary_item('profileindustry', 'CommunityServicesDevelopment', 'en_GB', 'Community Services & Development', true);
select add_dictionary_item('profileindustry', 'Construction', 'en_GB', 'Construction', true);
select add_dictionary_item('profileindustry', 'ConsultingStrategy', 'en_GB', 'Consulting & Strategy', true);
select add_dictionary_item('profileindustry', 'DesignArchitecture', 'en_GB', 'Design & Architecture', true);
select add_dictionary_item('profileindustry', 'EducationTraining', 'en_GB', 'Education & Training', true);
select add_dictionary_item('profileindustry', 'Engineering', 'en_GB', 'Engineering', true);
select add_dictionary_item('profileindustry', 'FarmingAnimalsConservation', 'en_GB', 'Farming, Animals & Conservation', true);
select add_dictionary_item('profileindustry', 'GovernmentDefence', 'en_GB', 'Government & Defence', true);
select add_dictionary_item('profileindustry', 'HealthcareMedical', 'en_GB', 'Healthcare & Medical', true);
select add_dictionary_item('profileindustry', 'HospitalityTourism', 'en_GB', 'Hospitality & Tourism', true);
select add_dictionary_item('profileindustry', 'HumanResourcesRecruitment', 'en_GB', 'Human Resources & Recruitment', true);
select add_dictionary_item('profileindustry', 'InformationCommunicationTechnology', 'en_GB', 'Information & Communication Technology', true);
select add_dictionary_item('profileindustry', 'InsuranceSuperannuation', 'en_GB', 'Insurance & Superannuation', true);
select add_dictionary_item('profileindustry', 'Legal', 'en_GB', 'Legal', true);
select add_dictionary_item('profileindustry', 'ManufacturingTransportLogistics', 'en_GB', 'Manufacturing, Transport & Logistics', true);
select add_dictionary_item('profileindustry', 'MarketingCommunications', 'en_GB', 'Marketing & Communications', true);
select add_dictionary_item('profileindustry', 'MiningResourcesEnergy', 'en_GB', 'Mining, Resources & Energy', true);
select add_dictionary_item('profileindustry', 'RealEstateProperty', 'en_GB', 'Real Estate & Property', true);
select add_dictionary_item('profileindustry', 'RetailConsumerProducts', 'en_GB', 'Retail & Consumer Products', true);
select add_dictionary_item('profileindustry', 'Sales', 'en_GB', 'Sales', true);
select add_dictionary_item('profileindustry', 'ScienceTechnology', 'en_GB', 'Science & Technology', true);
select add_dictionary_item('profileindustry', 'SportRecreation', 'en_GB', 'Sport & Recreation', true);
select add_dictionary_item('profileindustry', 'TradesServices', 'en_GB', 'Trades & Services', true);
select add_dictionary_item('profileindustry', 'Other', 'en_GB', 'Other', true);

--add Activity
select add_dictionary_item('activity', 'Education', 'en_GB', 'Education', true);
select add_dictionary_item('activity', 'ProductAnnouncement', 'en_GB', 'Product announcement', true);
select add_dictionary_item('activity', 'Other', 'en_GB', 'Other', true);

--add Custom fields
select add_custom_field('profile-job', 'en_GB', 'Job Title', 'String', '', 200, true);
select add_custom_field('profile-role', 'en_GB', 'Job Role', 'Id', 'category:profilerole', 0, true);
select add_custom_field('profile-industry', 'en_GB', 'Job Industry', 'ListOfIds', 'category:profileindustry', 0, true);
select add_custom_field('profile-company', 'en_GB', 'Your company', 'String', '', 200, true);
select add_custom_field('profile-lookup-persons', 'en_GB', 'People I am looking for', 'ListOfIds', 'category:profilerole', 0, true);
select add_custom_field('profile-lookup-activities', 'en_GB', 'Activities I am looking for', 'ListOfIds', 'category:activity', 0, true);
select add_custom_field('profile-lookup-industries', 'en_GB', 'Industries I am looking for', 'ListOfIds', 'category:profileindustry', 0, true);

