#!/bin/bash

# @file 04-aws-account.sh
# @brief Replace the AWS account number placeholder with your
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
# @arg $1 account ID (digits). All digits.
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "no profile specified. Exitting"
    exit
fi

old_string="enter_your_aws_account"
new_string="$1"

tmpfile=/tmp/msv.$$

for target_file in $(find . -type f -print -iname '*.sh' | xargs grep -l "$old_string"); do
  echo "replacing string on: $target_file"
  sed -e "s/$old_string/$new_string/g" $target_file > $tmpfile
  mv $tmpfile $target_file
done
