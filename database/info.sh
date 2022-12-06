#parameter1: origin domain, e.g. dev.enter_your.domain
#precondition: created Secret in Secret manager with database credentials for an origin
#precondition: jq and psql installed. Check psql path
#precondition: direct access to database

JSON=$(aws secretsmanager get-secret-value --secret-id $1/database --profile openexpo | jq --raw-output  '.SecretString')
DBNAME=$(echo $JSON | jq --raw-output '.dbname')
DBUSER=$(echo $JSON | jq --raw-output '.username')
DBPASS=$(echo $JSON | jq --raw-output '.password')
DBHOST=$(echo $JSON | jq --raw-output '.host')


cat > flyway-$DBNAME.bak <<-EOF
flyway.user=$DBUSER
flyway.password=$DBPASS
flyway.schemas=public
flyway.url=jdbc:postgresql://$DBHOST/$DBNAME
flyway.locations=filesystem:src/main/resources/db/migration
EOF

mvn flyway:info -Dflyway.configFiles=flyway-$DBNAME.bak
