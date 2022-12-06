#!/bin/bash

# @file 50-cloudfront.sh
# @brief Create or Update cloudfront setup to have S3 routed properly
# @description
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

echo "0. update copy of model directory"
#nothing here as no lambdas

#========================================================
STACKNAME=tex-cloudfront-$1
CHANGESETNAME=tex-cloudfront-update-$1
PARAMETERS=parameters-cloudfront-$1.json
TEMPLATE=cf-cloudfront.yaml

LEN=$(aws cloudformation list-stacks --query "StackSummaries[?StackName=='$STACKNAME']" --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE --profile openexpo | jq --raw-output 'length')

echo "stacks found: $LEN"

echo '0. packing template'

aws cloudformation package \
    --profile openexpo \
    --template-file $TEMPLATE \
    --force-upload \
    --output-template-file packaged.$TEMPLATE \
    --s3-bucket openexpo-lambda-storage-$1

#upload template max size 460,800
aws s3 cp ./packaged.$TEMPLATE s3://openexpo-lambda-storage-$1/packaged.$TEMPLATE --profile openexpo

if [ $LEN == 0 ]; then
#creation
    echo 'create'

    aws cloudformation create-stack \
	--profile openexpo \
	--stack-name $STACKNAME \
	--capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND CAPABILITY_NAMED_IAM \
        --tags Key=Environment,Value=$1 \
	--template-url https://s3.amazonaws.com/openexpo-lambda-storage-$1/packaged.$TEMPLATE \
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
	--template-url https://s3.amazonaws.com/openexpo-lambda-storage-$1/packaged.$TEMPLATE \
        --parameters file://./$PARAMETERS

    echo "2. waiting for changeset to be created"
    aws cloudformation wait change-set-create-complete --change-set-name $CHANGESETNAME --stack-name $STACKNAME --profile openexpo

    echo "3. executing Cloudformation changeset"
    aws cloudformation execute-change-set --change-set-name $CHANGESETNAME --stack-name $STACKNAME --profile openexpo

    echo "4. waiting for changeset to be applied"
    aws cloudformation wait stack-update-complete --stack-name $STACKNAME --profile openexpo
fi
