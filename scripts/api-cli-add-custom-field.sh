#!/bin/bash

# @file api-cli-add-custom-field.sh
# @brief Add new custom field, using lowlevel api
# @description
#     login using lowlevel client, taken from cloudformation stacks
#
#   prerequesites: 
#
# 	   * jq installed
#      * aws cli installed
#      * cognito set up

# @example
#    ./api-cli-add-custom-field.sh dev enter_your.domain profile-job en_GB "Job Title" "String" "^https?://.*" "200"
#
# @arg $1 string API deployment environment dev/prod
# @arg $2 string origin. if this combination of origin and env does not happen in api stacks, we try without env
# @arg $3 string custom field name
# @arg $4 string custom field default language
# @arg $5 string beautiful name in default language
# @arg $6 string type
# @arg $7 string validation
# @arg $8 string len
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

while read line ; do
JSON=$(aws cognito-idp describe-user-pool --user-pool-id $line --profile openexpo)
echo "JSON: $JSON"
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

#=========================================================
#dictionary
DICTID=$(http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=dictionary category_s=profilefield value_s=$3 | jq '.body' --raw-output | jq '.id')

echo "DICTID=$DICTID"

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=strings ref_s=dictionary ref_id_i=$DICTID category_s=name language_s=$4 value_s=$5 is_default_i=true

http --follow POST $INVOKEURL/lowlevel "Content-Type: application/json" "Authorization: Bearer $OAACCESSTOKEN" \
 table=strings ref_s=dictionary ref_id_i=$DICTID category_s=description_long language_s=$4 value_s="{type:\"$6\", validation:\"$7\", len:$8}" is_default_i=true
