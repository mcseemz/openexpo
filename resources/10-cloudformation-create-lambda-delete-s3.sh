aws cloudformation create-stack \
	--profile openexpo \
	--stack-name lambda-delete-s3 \
	--capabilities CAPABILITY_IAM \
	--template-body file://./cf-lambda-delete-s3.yaml
