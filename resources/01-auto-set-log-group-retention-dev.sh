aws cloudformation create-stack \
	--profile openexpo \
	--stack-name auto-set-log-group-retention-dev \
	--capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
	--template-body file://./external/auto-set-log-group-retention.yaml \
	--parameters file://./external/paramaters-auto-set-log-group-retention-dev.json
