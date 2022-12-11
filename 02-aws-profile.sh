#!/bin/bash

# @file 02-aws-profile.sh
# @brief Replace the openexpo default AWS profile name for your own
# @description
#     grep all the files, replacing placeholder with target profile name. Better when you have several projects with different profiles
#
#   prerequesites: 
#
#      * bash
#      * sed

# @example
#    ./02-aws-profile.sh ohexpo
#
# @arg $1 AWS pofile name from ./aws/config file. you should set it up manually in this file, based on AWS instructions. One word, no spec chars.
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "no profile specified. Exitting"
    exit
fi

old_string="\-\-profile openexpo"
new_string="\-\-profile $1"

tmpfile=/tmp/msv.$$

for target_file in $(find . -type f -print -iname '*.sh' | xargs grep -l "$old_string"); do
  echo "replacing string on: $target_file"
  sed -e "s/$old_string/$new_string/g" $target_file > $tmpfile
  mv $tmpfile $target_file
done
