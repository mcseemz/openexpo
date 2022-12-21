#!/bin/bash

# @file 31-database.sh
# @brief database creation script
# @description
#     upload python connectivity setup, and create non-default database on chosen RDS instance environment
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

mkdir /tmp/python-database

#https://github.com/jkehler/awslambda-psycopg2
git clone --depth 1 https://github.com/jkehler/awslambda-psycopg2.git /tmp/awslambda-psycopg2
mv /tmp/awslambda-psycopg2/psycopg2-3.9 /tmp/python-database/psycopg2

pip3 install boto3 -t /tmp/python-database
zip -r layer-python-database.zip /tmp/python-database

aws s3 cp layer-python-database.zip s3://openexpo-lambda-storage-$1/ --profile openexpo

rm layer-python-database.zip
rm -rf /tmp/python-database
rm -rf /tmp/awslambda-psycopg2

STACKNAME=tex-database-$1
CHANGESETNAME=tex-database-update-$1
PARAMETERS=parameters-database-$1.json
TEMPLATE=cf-database.yaml

LEN=$(aws cloudformation list-stacks --query "StackSummaries[?StackName=='$STACKNAME']" --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE --profile openexpo | jq --raw-output 'length')

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
        --template-body file://./packaged.$TEMPLATE \
        --parameters file://./$PARAMETERS

    echo "2. waiting for changeset to be created"
    aws cloudformation wait change-set-create-complete --change-set-name $CHANGESETNAME --stack-name $STACKNAME --profile openexpo

    echo "3. executing Cloudformation changeset"
    aws cloudformation execute-change-set --change-set-name $CHANGESETNAME --stack-name $STACKNAME --profile openexpo

    echo "4. waiting for changeset to be applied"
    aws cloudformation wait stack-update-complete --stack-name $STACKNAME --profile openexpo
fi
