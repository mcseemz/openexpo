#!/bin/bash

# @file loggroups-assign-subscription-filter.sh
# @brief assign subscriptions to Environment tags
# @description
#     we use it to auto-assign subscription filters with auto-assign CF template
#
#   prerequesites:
#
#      * jq installed
#      * aws cli installed
#

# @arg $1 env, e.g. dev/prod
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }
if [ -z "$1" ]; then
    echo "parameters required. Exitting"
    exit
fi

ARN=$(aws cloudformation list-exports --max-items 500 --profile openexpo | jq --raw-output ".Exports[] | select(.Name == \"log-processing-lambda-arn-$1\") | .Value")
if [ -z "$ARN" ]; then
	echo "no ARN found! Exit"
	exit
fi

CWNAME=$(aws cloudformation list-exports --max-items 500 --profile openexpo | jq --raw-output ".Exports[] | select(.Name == \"log-processing-lambda-name-$1\") | .Value")


aws logs describe-log-groups --max-items 500 --log-group-name-prefix /aws/lambda --profile openexpo | jq --raw-output '.logGroups[].logGroupName' > lambdas.bak

while read lambda; do
    echo -n "checking $lambda... "
    TAGS=$(aws logs list-tags-log-group --log-group-name $lambda --profile openexpo | jq --raw-output '.tags.Environment')
    if [ -z "$TAGS" ]; then
	echo "no Environment. Skip"
	continue
    fi
    if [ "$TAGS" != "$1" ]; then
	echo "Wrong Environment. Skip"
	continue
    fi

    if [ "$lambda" == *$CWNAME ]; then
	echo "Self-found. Skip"
	continue
    fi

    aws logs put-subscription-filter --log-group-name $lambda --filter-name statistics-$1 --filter-pattern "{ ($.lambda_name = *) || ($.idxen = *) }" --destination-arn $ARN --profile openexpo
    echo "Success"
done <lambdas.bak
