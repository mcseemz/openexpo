#!/bin/bash

# @file backend-rollout-complete.sh
# @brief full backend rollout cycle (lambda + API)
# @description
#     we batch all required steps for backend redeployment into one. only dev/prod envs are supported
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

case "$1" in
        dev)
	    echo "executing dev"
	
	    cd ../resources
            source ./70-api-lambda.sh $1

	    echo "5. executing Swagger API update"
            cd ../scripts
	    source ./api-update.sh dev
	    
	    echo "6. updating event subscriptions"
            cd ../scripts
	    source ./loggroups-assign-tags.sh dev
	    source ./loggroups-assign-subscription-filter.sh dev
            ;;
         
        prod)
	    echo "executing prod"

	    cd ../resources
            source ./70-api-lambda.sh prod

	    echo "5. executing Swagger API update"
            cd ../scripts
	    source ./api-update.sh prod

	    echo "6. updating event subscriptions"
	    cd ../scripts
	    source ./loggroups-assign-tags.sh prod
	    source ./loggroups-assign-subscription-filter.sh prod
            ;;
         
        *)
            echo $"wrong environment. Usage: $0 {dev|prod}"
            exit 1
 
esac
