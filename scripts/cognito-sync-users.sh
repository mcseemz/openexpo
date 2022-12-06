#!/bin/bash

# @file cognito-sync-users.sh
# @brief copy user emails from cognito to database
# @description
#     this is one time job in case you have database recreated with active cognito.
#	  just to keep users able to log in with same credentials.
#
#   prerequesites: 
#
# 	   * jq installed
#      * aws cli installed
#      * cognito set up

# @example
#    ./cognito-sync-users dev enter_your.domain
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

#--------------------------------------------------------

#get user list
aws cognito-idp list-users --user-pool-id $USERPOOLID --profile openexpo | jq '.Users[] | select(.UserStatus == "CONFIRMED") | .Attributes[] | select(.Name == "email") | .Value' > emails.bak

xargs -n 1 -I{} http --ignore-stdin --follow --max-redirects=2 POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
  table=person name_s=Anonimous surname_s="Meerkat" email_s={} status_s=active < emails.bak

