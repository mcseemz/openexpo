#!/bin/bash

# @file 71-api-domain-com.sh
# @brief create domain binding to API Gateway (.com domain)
# @description
#     create Route53 linking to API gateway. Currently spported environments are dev/prod
#     create/update stack supported
#     this shell file can be reused to support multiple domains, by changing parameter files
#
#   prerequesites:
#
#      * jq installed
#      * aws cli installed
#

# @arg $1 string API deployment environment dev/prod
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "environment required. Exitting"
    exit
fi


STACKNAME=tex-api-domain-com-$1
CHANGESETNAME=tex-api-domain-com-$1
PARAMETERS=parameters-api-domain-com-$1.json
TEMPLATE=cf-api-domain.yaml

LEN=$(aws cloudformation list-stacks --query "StackSummaries[?StackName=='$STACKNAME']" --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --profile openexpo | jq --raw-output 'length')

echo "stacks found: $LEN"

echo '0. packing template'

aws cloudformation package \
    --profile openexpo \
    --template-file $TEMPLATE \
    --force-upload \
    --output-template-file packaged.$TEMPLATE \
    --s3-bucket openexpo-lambda-storage-$1

if [ $LEN == 0 ]; then
#creation
    echo 'create'
    aws cloudformation create-stack \
	--profile openexpo \
	--stack-name $STACKNAME \
	--capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND CAPABILITY_NAMED_IAM \
        --tags Key=Environment,Value=$1 \
	--template-body file://./packaged.$TEMPLATE \
	--parameters file://./$PARAMETERS

    echo 'wait for creation complete'
    aws cloudformation wait stack-create-complete --stack-name $STACKNAME --profile openexpo

else

    echo '1. create change set'
         
    aws cloudformation create-change-set \
        --profile openexpo \
        --stack-name $STACKNAME \
        --change-set-name $CHANGESETNAME \
        --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND CAPABILITY_NAMED_IAM \
        --tags Key=Environment,Value=$1 \
        --template-body file://./packaged.$TEMPLATE \
        --parameters file://./$PARAMETERS

    echo "2. waiting for changeset to be created"
    aws cloudformation wait change-set-create-complete --change-set-name $CHANGESETNAME --stack-name $STACKNAME --profile openexpo

    echo "3. executing Cloudformation changeset"
    aws cloudformation execute-change-set --change-set-name $CHANGESETNAME --stack-name $STACKNAME --profile openexpo

    echo "4. waiting for changeset to be applied"
    aws cloudformation wait stack-update-complete --stack-name $STACKNAME --profile openexpo
fi
