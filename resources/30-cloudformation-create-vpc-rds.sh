aws cloudformation create-stack \
	--profile openexpo \
	--stack-name tex-vpc-rds \
	--capabilities CAPABILITY_IAM \
	--template-body file://./cf-vpc-rds.yaml \
	--parameters file://./parameters-vpc-rds-dev.json
