#!/bin/bash

# @file ses-delete-template.sh
# @brief delete ses template by name
# @description
#
#   prerequesites:
#
# 	   * aws cli installed
#
# @example
#    ./ses-delete-template.sh CompanyUpdatedRoleOrPosition
#
# @arg $1 template  name (can be found in initial json or SES)
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

aws ses delete-template --template-name ${1} --profile openexpo
