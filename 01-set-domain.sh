#!/bin/bash

# @file 01-set-domain.sh
# @brief Replace the enter_your<.>domain with the proper domain name
# @description
#     grep all the files, replacing placeholder with target domain name. You already have domain name, don't you?
#
#   prerequesites: 
#
#      * bash
#      * sed

# @example
#    ./01-set-domain.sh mydomain.com
#
# @arg $1 2nd level domain nome, no www or other prefixes. We do not expect it to work with 3rd level domains
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

if [ -z "$1" ]; then
    echo "no domain specified. Exitting"
    exit
fi

old_string=expoze.live
new_string=$1

tmpfile=/tmp/msv.$$

for target_file in $(find . -type f -print -iname '*.sh' -o -iname '*.js' -o -iname '*.yaml' -o -iname '*.html' | xargs grep -l "$old_string"); do
  echo "replacing string on: $target_file"
  sed -e "s/$old_string/$new_string/g" $target_file > $tmpfile
  mv $tmpfile $target_file
done
