#!/bin/bash

# @file 05-domain-certificate.sh
# @brief Replace the AWS Domain Certificate placeholder with the actual value
# @description
#     grep all the files, replacing placeholder with target profile name. Better when you have several projects with different profiles
#
#   prerequesites: 
#
#      * bash
#      * sed

# @example
#    ./04-aws-account.sh 123456789012
#
# @arg $1 certificate ARN, e.g. arn:aws:acm:eu-central-1:175685995419:certificate/5b6f4d13-1992-44eb-8c0e-a6d557ee6bdb
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "no profile specified. Exitting"
    exit
fi

old_string="enter_your_domain_certificate"
new_string="$1"

tmpfile=/tmp/msv.$$

for target_file in $(find . -type f -print -iname '*.sh' | xargs grep -l "$old_string"); do
  echo "replacing string on: $target_file"
  sed -e "s/$old_string/$new_string/g" $target_file > $tmpfile
  mv $tmpfile $target_file
done
