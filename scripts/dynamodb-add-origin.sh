#!/bin/bash

# @file dynamodb-add-origin.sh
# @brief adds/replaces origin record for resource mapping
# @description
#		adds data to central routing table.
#     This should be done once per origin
#
#   prerequesites: 
#
#      * aws cli installed
#

# @arg $1 string origin domain, e.g dev.enter_your.domain
# @arg $2 string S3 bucket for binaries, dev-openexpo-com-binaries
# @arg $3 string Cognito userpool id for respective database
# @arg $4 string api domain for this origin, e.g. apidev.enter_your.domain
# @arg $5 string binary bucket domain for this origin, e.g. binary-dev.enter_your.domain
# @arg $6 string envinronment dev/prod
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }

aws dynamodb put-item \
    --table-name texorigins \
	--item "{\"origindomain\": {\"S\":\"$1\"}, \"bucket\": {\"S\":\"$2\"}, \"userpool\": {\"S\":\"$3\"}, \"apidomain\": {\"S\":\"$4\"}, \"binarydomain\": {\"S\":\"$5\"}, \"environment\": {\"S\":\"$6\"}}" \
    --profile openexpo
