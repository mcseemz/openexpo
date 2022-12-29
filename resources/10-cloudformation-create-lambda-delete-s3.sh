#!/bin/bash

# @file 20-s3-resources.sh
# @brief s3 resources creation, including S3 event lambda processing
# @description
#     upload initial prereqs and create/update stack
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

STACKNAME=lambda-delete-s3
CHANGESETNAME=lambda-delete-s3-update
#PARAMETERS=parameters-cf-lambda-delete-s3.json
TEMPLATE=cf-lambda-delete-s3.yaml

aws cloudformation create-stack \
	--profile openexpo \
	--stack-name $STACKNAME \
	--capabilities CAPABILITY_IAM \
	--template-body file://./$TEMPLATE

echo 'wait for creation complete'
aws cloudformation wait stack-create-complete --stack-name $STACKNAME --profile openexpo