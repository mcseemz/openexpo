aws cloudformation create-change-set \
        --profile openexpo \
        --stack-name tex-vpc-rds \
	--change-set-name tex-vpc-rds-update \
        --capabilities CAPABILITY_IAM \
        --template-body file://./cf-vpc-rds.yaml \
        --parameters file://./parameters-vpc-rds-dev.json
