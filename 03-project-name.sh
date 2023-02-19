#!/bin/bash

# @file 03-project-name.sh
# @brief Replace the openexpo project name with custom name
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
# @arg $1 custom project name. All smalls, no spaces or spec characters, besides '-'.
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "no profile specified. Exitting"
    exit
fi

old_string="openexpo-lambda-storage"
new_string="$1-lambda-storage"

tmpfile=/tmp/msv.$$

for target_file in $(find . -type f -print -iname '*.sh' | xargs grep -l "$old_string"); do
  echo "replacing string on: $target_file"
  sed -e "s/$old_string/$new_string/g" $target_file > $tmpfile
  mv $tmpfile $target_file
done

#------------------------------------------
old_string="openexpo-statics-"
new_string="$1-statics-"

tmpfile=/tmp/msv.$$

for target_file in $(find . -type f -print -iname '*.sh' | xargs grep -l "$old_string"); do
  echo "replacing string on: $target_file"
  sed -e "s/$old_string/$new_string/g" $target_file > $tmpfile
  mv $tmpfile $target_file
done
