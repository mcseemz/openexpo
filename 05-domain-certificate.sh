#!/bin/bash

# @file 05-domain-certificate.sh
# @brief Identify all place to replace the AWS Domain Certificate placeholder with the actual value
# @description
#     identifies all files to inject ACM certificate
#
#   prerequesites: 
#
#      * bash
#      * xargs

# @example
#    ./05-domain-certificate.sh
#
# @arg no args required
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }


old_string="enter_your_domain_certificate"

echo "PLEASE UPDATE THOSE FILES MANUALLY:"

for target_file in $(find . -type f -print -iname '*.sh' | xargs grep -s -l "$old_string"); do
    if [[ $target_file =~ '05-domain-certificate.sh' ]]; then
     echo "this file"
    else
      echo "$target_file"
    fi
done

echo "PRESS ENTER TO CONTINUE"
read