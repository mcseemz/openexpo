#!/bin/bash

# @file lambda-get-active-roles.sh
# @brief list all active roles for an account
#
#   prerequesites: 
#
# 	   * jq installed
#      * aws cli installed
#

# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

aws lambda list-functions --profile openexpo | jq --raw-output ".Functions[].Role" | sort -u
