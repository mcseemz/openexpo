#!/bin/bash

# @file ses-create-template.sh
# @brief upload json email template to ses
# @description
#
#   prerequesites:
#
# 	   * aws cli installed
#
# @example
#    ./ses-create-template.sh companyUpdatedRoleOrPosition.json
#
# @arg $1 template file name (full)
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

aws ses create-template --cli-input-json file://${1} --profile openexpo
