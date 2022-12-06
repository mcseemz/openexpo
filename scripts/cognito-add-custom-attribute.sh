#!/bin/bash

# @file cognito-upload-csv.sh
# @brief add custom attributes to user pool.
# @description
#     user management operations require custom attributes un Cognito in the form of "custom:<attributename>"
#     explanation is here: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/add-custom-attributes.html
#
#   prerequesites:
#
#      * jq installed
#      * sed installed
#      * aws cli installed
#      * cognito set up
#

# @arg $1 string API deployment environment dev/prod

# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "parameters required. Exitting"
    exit
fi


USERPOOLID=$(aws cloudformation list-exports --query "Exports[?Name==\`CognitoUserPoolId-$1\`].Value" --no-paginate --output text --profile openexpo)
ROLEARN=$(aws cloudformation list-exports --query "Exports[?Name==\`api-gateway-logging-role-arn-$1\`].Value" --no-paginate --output text --profile openexpo)

aws cognito-idp add-custom-attributes --user-pool-id "$USERPOOLID" --custom-attributes Name=domain,AttributeDataType=String,DeveloperOnlyAttribute=false,Mutable=true,Required=false --profile openexpo

aws cognito-idp add-custom-attributes --user-pool-id "$USERPOOLID" --custom-attributes Name=invitationId,AttributeDataType=String,DeveloperOnlyAttribute=false,Mutable=true,Required=false --profile openexpo

aws cognito-idp add-custom-attributes --user-pool-id "$USERPOOLID" --custom-attributes Name=invitationType,AttributeDataType=String,DeveloperOnlyAttribute=false,Mutable=true,Required=false --profile openexpo

aws cognito-idp add-custom-attributes --user-pool-id "$USERPOOLID" --custom-attributes Name=baseEmail,AttributeDataType=String,DeveloperOnlyAttribute=false,Mutable=true,Required=false --profile openexpo
