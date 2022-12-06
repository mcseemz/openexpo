#!/bin/bash

# @file loggroups-assign-tags.sh
# @brief assign tags to log groups to match env
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

aws logs describe-log-groups --max-items 500 --log-group-name-prefix /aws/lambda --profile openexpo | jq --raw-output '.logGroups[].logGroupName' > lambdas.bak

regex=$1$

while read lambda; do
    echo -n "checking $lambda..."
    [[ $lambda =~ $regex ]] && aws logs tag-log-group --log-group-name $lambda --tags Environment=$1 --profile openexpo || echo 'skipped'
done <lambdas.bak
