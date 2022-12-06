#!/bin/bash

# @file dynamodb-create-origins-table.sh
# @brief creates global origins table for resource mapping
# @description
#	creates global origins table for resource mapping
#	this is generally one-time job per account
#	when expanding to multiple regions, replication should be established as part of dynamodb global table
#
#   prerequesites: 
#
#      * aws cli installed
#

# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

aws dynamodb create-table \
    --table-name texorigins \
    --attribute-definitions AttributeName=origindomain,AttributeType=S \
    --key-schema AttributeName=origindomain,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --tags Key=creator,Value=mcseemz \
    --profile openexpo

# AttributeName=bucket,AttributeType=S AttributeName=userpool,AttributeType=S AttributeName=apidomain,AttributeType=S
#    --global-secondary-indexes IndexName=index_bucket,KeySchema=["{AttributeName=bucket,KeyType=RANGE}"],Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=1,WriteCapacityUnits=1}" \
#    	IndexName=index_userpool,KeySchema=["{AttributeName=userpool,KeyType=RANGE}"],Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=1,WriteCapacityUnits=1}" \
#    	IndexName=index_apidomain,KeySchema=["{AttributeName=apidomain,KeyType=RANGE}"],Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=1,WriteCapacityUnits=1}" \
