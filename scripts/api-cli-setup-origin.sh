#!/bin/bash

# @file api-cli-setup-origin.sh
# @brief Setup initial data for database, using lowlevel api
# @description
#     login using lowlevel client, taken from cloudformation stacks:
#
#      * role
#      * platform
#      * category
#      * languages
#      * timezones
#      * imagesize
#      * currency
#
#   prerequesites: 
#
# 	   * jq installed
#      * aws cli installed
#      * cognito set up

# @example
#    ./api-cli-setup-origin.sh dev enter_your.domain
#
# @arg $1 string API deployment environment dev/prod
# @arg $2 string origin. if this combination of origin and env does not happen in api stacks, we try without env
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

while read line ; do
JSON=$(aws cognito-idp describe-user-pool --user-pool-id $line --profile openexpo)
TEMPID=$(echo $JSON | jq --raw-output ".UserPool as \$parent | .UserPool.UserPoolTags | if has(\"$2\") then \$parent.Id else \"\" end")
echo "found some user pool: $TEMPID"

if [ -z "$TEMPID" ]; then
  echo "skipping"
else
USERPOOLID=$TEMPID
echo "target user pool: $USERPOOLID"
AUTHDOMAIN=$(echo $JSON | jq --raw-output '.UserPool.CustomDomain')
echo "AUTHDOMAIN: $AUTHDOMAIN"
fi

done <<< "$(aws cognito-idp list-user-pools --max-results 60 --profile openexpo | jq --raw-output '.UserPools[] | .Id')"

echo "target user pool: $USERPOOLID"

if [ -z "$USERPOOLID" ]; then
  echo "no user pool found. exitting"
  exit -1
fi

# User creation and authorization flow
#
#CLIENTNAME=api-cli
#USERLOGIN=admin@enter_your.domain
#USERPASS=admin123AZ!
#APP1 no secrets   --generate-secret --allowed-o-auth-flows client_credentials
#aws cognito-idp create-user-pool-client --user-pool-id $USERPOOLID --client-name $CLIENTNAME --explicit-auth-flows ADMIN_NO_SRP_AUTH --supported-identity-providers COGNITO --prevent-user-existence-errors ENABLED --profile openexpo > client.bak
#CLIENTID=$(cat client.bak | jq --raw-output '.UserPoolClient.ClientId')
#CLIENTSECRET=$(cat client.bak | jq --raw-output '.UserPoolClient.ClientSecret')
#echo "client id:secret : $CLIENTID:$CLIENTSECRET"

#create admin user
#aws cognito-idp sign-up \
#   --region eu-central-1 \
#   --client-id $CLIENTID \
#   --username $USERLOGIN \
#   --password $USERPASS \
#   --user-attributes Name=email,Value=$USERLOGIN \
#   --profile openexpo

#aws cognito-idp admin-confirm-sign-up \
#	--user-pool-id $USERPOOLID \
#	--username $USERLOGIN \
#	--profile openexpo

#--------------------------------------------------------

OACLIENTID=$(aws cognito-idp list-user-pool-clients --user-pool-id $USERPOOLID --profile openexpo | jq --raw-output '.UserPoolClients[] | select(.ClientName == "tex-app-lowlevel") | .ClientId')
echo "OACLIENTID: $OACLIENTID"

OACLIENTSECRET=$(aws cognito-idp describe-user-pool-client --user-pool-id $USERPOOLID --client-id $OACLIENTID --profile openexpo | jq --raw-output '.UserPoolClient.ClientSecret')
echo "OACLIENTSECRET: $OACLIENTSECRET"

curl -X POST --user $OACLIENTID:$OACLIENTSECRET "https://$AUTHDOMAIN/oauth2/token?grant_type=client_credentials" -H 'Content-Type: application/x-www-form-urlencoded' > client.bak
OAACCESSTOKEN=$(cat client.bak | jq --raw-output '.access_token')
echo "OAACCESSTOKEN: $OAACCESSTOKEN"

INVOKEURL=$(aws cloudformation list-exports --query "Exports[?Name==\`TexPublicAPIURL-$1-${2//[_.\/:]/-}\`].Value" --no-paginate --output text --profile openexpo)
echo "INVOKEURL: $INVOKEURL"
if [ -z "$INVOKEURL" ]; then
  echo "retry INVOKEURL"
INVOKEURL=$(aws cloudformation list-exports --query "Exports[?Name==\`TexPublicAPIURL-${2//[_.\/:]/-}\`].Value" --no-paginate --output text --profile openexpo)
  echo "INVOKEURL: $INVOKEURL"
fi

#=========================================================
#role
#--- platform roles
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=platform-uberadmin grants_s=[\"platform-moderate-event\",\"platform-access-event\",\"platform-access-stand\",\"platform-access-company\",\"platform-access-audit\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=platform-manager grants_s=[\"platform-moderate-event\",\"platform-access-event\",\"platform-access-stand\",\"platform-access-company\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=platform-moderator grants_s=[\"platform-moderate-event\"]
echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=1 category_s=name language_s=en_GB value_s="Admin" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=2 category_s=name language_s=en_GB value_s="Platform manager" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=3 category_s=name language_s=en_GB value_s="Platform moderator" is_default_i=true 
    echo

#--- company roles
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=company-owner grants_s=[\"company-edit\",\"company-delete\",\"company-create-event\",\"company-view-reports\",\"company-manage-news\",\"company-manage-staff\",\"company-manage-news\",\"company-manage-sponsorship\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=company-helper grants_s=[\"company-edit\",\"company-manage-news\",\"company-manage-staff\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=company-staff grants_s=[\"\"]
echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=4 category_s=name language_s=en_GB value_s="Company owner" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=5 category_s=name language_s=en_GB value_s="Company helper" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=6 category_s=name language_s=en_GB value_s="Company staff" is_default_i=true 
    echo

#--- event roles
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=event-owner grants_s=[\"event-edit\",\"event-delete\",\"event-manage-news\",\"event-manage-staff\",\"event-manage-money\",\"event-view-report\",\"event-invite-stand\",\"event-manage-chat\",\"event-use-chat\",\"event-use-video\",\"event-manage-news\",\"event-manage-sponsorship\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=event-manager grants_s=[\"event-edit\",\"event-manage-news\",\"event-manage-staff\",\"event-view-report\",\"event-manage-chat\",\"event-use-chat\",\"event-use-video\",\"event-manage-news\",\"event-manage-sponsorship\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=event-sales grants_s=[\"event-use-chat\",\"event-use-video\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=event-support grants_s=[\"event-use-chat\"]
echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=7 category_s=name language_s=en_GB value_s="Event owner" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=8 category_s=name language_s=en_GB value_s="Event manager" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=9 category_s=name language_s=en_GB value_s="Event sales" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=10 category_s=name language_s=en_GB value_s="Event support" is_default_i=true 
    echo

#--- stand roles
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=stand-owner grants_s=[\"stand-edit\",\"stand-delete\",\"stand-manage-news\",\"stand-manage-staff\",\"stand-view-report\",\"stand-use-chat\",\"stand-use-video\",\"stand-manage-news\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=stand-manager grants_s=[\"stand-edit\",\"stand-manage-news\",\"stand-manage-staff\",\"stand-view-report\",\"stand-use-chat\",\"stand-use-video\",\"stand-manage-news\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=stand-sales grants_s=[\"stand-use-chat\",\"stand-use-video\"]
echo
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=role name_s=stand-support grants_s=[\"stand-use-chat\"]
echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=11 category_s=name language_s=en_GB value_s="Stand owner" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=12 category_s=name language_s=en_GB value_s="Stand manager" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=13 category_s=name language_s=en_GB value_s="Stand sales" is_default_i=true 
    echo

    http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
     table=strings ref_s=role ref_id_i=14 category_s=name language_s=en_GB value_s="Stand support" is_default_i=true 
    echo

#=========================================================
#platform
http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=platform name_s=tex-$1

#=========================================================
#category
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=category value_s=Health | jq '.body' --raw-output | jq '.id')

echo "DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s=Health is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s=Здоровье is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s=Gesundheit is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=category value_s=Technology | jq '.body' --raw-output | jq '.id')

echo "DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s=Technology is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s=Технологии is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s=Technologie is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=category value_s=FilmMedia | jq '.body' --raw-output | jq '.id')
echo "DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="Film & Media" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="Фильмы и Медиа" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="Film & Medien" is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=category value_s=Business | jq '.body' --raw-output | jq '.id')
echo "DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s=Business is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s=Бизнес is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="Geschäft" is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=category value_s=TravelOutdoor | jq '.body' --raw-output | jq '.id')
echo "DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="Travel & Outdoor" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="Путешествия и Активности" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="Reisen & Outdoor" is_default_i=false 


#=========================================================
#languages
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=language value_s=English | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="English" is_default_i=true 

DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=language value_s=Russian | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="Русский" is_default_i=true 

DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=language value_s=German | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="Deutsche" is_default_i=true

DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=language value_s=French | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=fr_FR value_s="Français" is_default_i=true

#=========================================================
#timezones
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=timezone value_s="0" | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="GMT+0 London" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="GMT+0 Лондон" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="GMT+0 London" is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=timezone value_s="1" | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="GMT+1 Madrid" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="GMT+1 Мадрид" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="GMT+1 Madrid" is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=timezone value_s="2" | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="GMT+2 Berlin" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="GMT+2 Берлин" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="GMT+2 Berlin" is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=timezone value_s="3" | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="GMT+3 Moscow" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="GMT+3 Москва" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="GMT+3 Moskau" is_default_i=false 

#----
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=timezone value_s="5.5" | jq '.body' --raw-output | jq '.id')
echo "language DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=en_GB value_s="GMT+5:30 Delhi" is_default_i=true 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=ru_RU value_s="GMT+5:30 Дели" is_default_i=false 

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=de_DE value_s="GMT+5:30 Delhi" is_default_i=false 

#----------
#imagesize
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="560x315" | jq '.body' --raw-output | jq '.id')
echo "imagesize DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="64x64"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="368x208"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="448x252"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="144x56"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="302x211"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=imagesize value_s="315x674"

#----------
#currency
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=currency value_s="EUR" | jq '.body' --raw-output | jq '.id')
echo "currency DICTID=$DICTID"

DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=currency value_s="USD" | jq '.body' --raw-output | jq '.id')
echo "currency DICTID=$DICTID"

DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=dictionary category_s=currency value_s="RUB" | jq '.body' --raw-output | jq '.id')
echo "currency DICTID=$DICTID"
