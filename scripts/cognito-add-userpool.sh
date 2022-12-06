#!/bin/bash

# @file cognito-add-userpool.sh
# @brief adds stack with userpool for new database
# @description
#	this should be done once per database.
#	BUT when you deploy new region - initial stack should be crated along with other resources.
#	this stack depends on initial cognito deployment.
#
#   prerequesites: 
#
# 	   * jq installed
#      * aws cli installed
#      * cognito set up

# @example
#    ./cognito-add-userpool.sh dev enter_your.domain
#
# @arg $1 environment name (dev|prod) - where initial Cognito resources were deployed
# @arg $2 origin domain - used to distinguish resources. we can take any origin per database
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

JSON=$(aws secretsmanager get-secret-value --secret-id $2/database --profile openexpo | jq --raw-output  '.SecretString')
DBNAME=$(echo $JSON | jq --raw-output '.dbname')

aws cloudformation create-stack \
        --profile openexpo \
        --stack-name tex-cognito-${DBNAME//[_.\/:]/-} \
        --capabilities CAPABILITY_IAM \
        --template-body file://./cf-cognito-addon.yaml \
        --parameters ParameterKey=Environment,ParameterValue=$1 ParameterKey=Dbname,ParameterValue=${DBNAME//[_.\/:]/-}
    
