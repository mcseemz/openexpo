#!/bin/bash

# @file api-update.sh
# @brief Step 2 of no-downtime API update. Updates OpenAPI definitions for Gateway API
# @description
#     first we run changeset (e.g. /resources/70-cloudformation-create-lambda-changeset.sh), this should be run second
#
#   prerequesites: 
#
#      * jq installed
#      * sed installed
#      * aws cli installed
#      * cognito set up
#

# @arg $1 string API deployment environment dev/prod
# @arg $2 API stack name (optional)
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "parameters required. Exitting"
    exit
fi

stackName=tex-lambda-apigateway-$1
REGION=eu-central-1
ACCOUNTID=$(set -e; aws sts get-caller-identity --query 'Account' --output text --profile openexpo)
RESTAPIID=$(aws cloudformation list-exports --query "Exports[?Name==\`TexAPI-$1\`].Value" --no-paginate --output text --profile openexpo)

#APIGWROLEID=$(set -e; aws cloudformation describe-stack-resource --stack-name $stackName --logical-resource-id ApiGatewayAccessRole \
#	--query 'StackResourceDetail.PhysicalResourceId' --output text --profile openexpo)
#APIGWACCESSROLE=arn:aws:iam::$ACCOUNTID:role/$APIGWROLEID

APIGWACCESSROLE=$(aws cloudformation list-exports --query "Exports[?Name=='api-gateway-access-role-arn-$1'].Value" --no-paginate --output text --profile openexpo)
COGNITOARN=$(aws cloudformation list-exports --query "Exports[?Name==\`CognitoUserPoolArn-$1\`].Value" --no-paginate --output text --profile openexpo)

echo "APIGWACCESSROLE=$APIGWACCESSROLE"

cd ../API

sed -E "s!'Fn::Sub': '\\$\{ApiGatewayAccessRole.Arn\}'!${APIGWACCESSROLE}!g; s!title:.*!title: Openexpo Swagger API $1!" openapi.yaml > openapi-update-$1.yaml

aws cloudformation list-stack-resources \
    --stack-name $stackName \
    --profile openexpo |
    jq --arg REGION "$REGION" \
	--arg ACCOUNTID "$ACCOUNTID" \
	--raw-output \
	'.StackResourceSummaries[] | select(.ResourceType == "AWS::Lambda::Function") | [.LogicalResourceId, .PhysicalResourceId] | @tsv' |
    while IFS=$'\t' read -r LogicalResourceId PhysicalResourceId ; do
	sed -i "" -E "s!/\\$\{$LogicalResourceId.Arn\}!/arn:aws:lambda:${REGION}:${ACCOUNTID}:function:$PhysicalResourceId!g" openapi-update-$1.yaml
    done

sed -i "" -E "s!\\$\{AWS::Region\}!${REGION}!g" openapi-update-$1.yaml
sed -i "" -E "s!'Fn::Sub': '(.*)'!\1!g" openapi-update-$1.yaml

sed -i "" -E "s!    Fn::Sub: \"CognitoUserPoolArn-\\$\{Environment\}\"!- ${COGNITOARN}!g" openapi-update-$1.yaml
sed -i "" -E "s!\\$\{Environment\}!$1!g" openapi-update-$1.yaml


grep -v "Fn::ImportValue:" openapi-update-$1.yaml > openapi-update-$1-1.yaml
mv openapi-update-$1-1.yaml openapi-update-$1.yaml

aws apigateway put-rest-api --rest-api-id $RESTAPIID --mode overwrite --fail-on-warnings \
    --body file://./openapi-update-$1.yaml \
    --cli-binary-format raw-in-base64-out \
    --profile openexpo
    
aws apigateway create-deployment --rest-api-id $RESTAPIID --stage-name LATEST --description 'autodeploy' --profile openexpo

mv openapi-update-$1.yaml openapi-update-$1.yaml.bak
