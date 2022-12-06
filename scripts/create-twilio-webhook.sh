#Creates webhook in Twilio for a given chat and environment
#parameter1: API environment dev/prod
#example call for dev environment: create-twilio-webhook.sh  dev

JSON=$(aws secretsmanager get-secret-value --secret-id $1/twilio --profile openexpo | jq --raw-output  '.SecretString')
ACCOUNT_SID=$(echo $JSON | jq --raw-output '.chat_accountsid')
SERVICE_SID=$(echo $JSON | jq --raw-output '.chat_servicesid')
AUTH_TOKEN=$(echo $JSON | jq --raw-output '.auth_token')

curl -X POST https://chat.twilio.com/v2/Services/"$SERVICE_SID" \
--data-urlencode "PostWebhookUrl=https://apidev.enter_your.domain/chat/webhook/$1/onMessageSent" \
--data-urlencode "WebhookMethod=POST" \
--data-urlencode "WebhookFilters=onMessageSent" \
--data-urlencode "WebhookFilters=onMediaMessageSent" \
-u "$ACCOUNT_SID":"$AUTH_TOKEN"
