#!/bin/bash

# @file rds-create-database.sh
# @brief create new database per region
# @description
#     we use it to have several datbases in one region
#	  all required credentials are stored in secrets manager per origin
#
#   prerequesites: 
#
# 	   * jq installed
#		* psql installed. Check psql path
#      * aws cli installed
#      * created Secret in Secret manager with database credentials for an origin
#		* created "stub" database in targeted RDS
#

# @arg $1 origin, e.g. dev.enter_your.domain
# @exitcode 0 If successful.
# @exitcode 1 If an empty string passed.
documentation() { echo '---------------------'; }


JSON=$(aws secretsmanager get-secret-value --secret-id $1/database --profile openexpo | jq --raw-output  '.SecretString')
DBNAME=$(echo $JSON | jq --raw-output '.dbname')
DBUSER=$(echo $JSON | jq --raw-output '.username')
DBPASS=$(echo $JSON | jq --raw-output '.password')
DBHOST=$(echo $JSON | jq --raw-output '.host')

mv ~/.pgpass ~/.pgpass.bak
echo $DBHOST:5432:stub:$DBUSER:$DBPASS >> ~/.pgpass
chmod 0600 ~/.pgpass

#onetime run to create stub
#/Users/postgres/bin/psql --host=$DBHOST --dbname db_name_dev \
#     --username=$DBUSER --no-password \
#     --command="CREATE DATABASE stub WITH OWNER $DBUSER"


DBEXISTS=$(/Users/postgres/bin/psql -tA --host=$DBHOST --dbname stub \
     --username=$DBUSER --no-password \
     --command="SELECT 1 FROM pg_database WHERE datname='$DBNAME'")
     
if [ $DBEXISTS = '1' ]
then
    echo "Database already exists"
else
    echo "Database does not exist. Creating"
    /Users/postgres/bin/psql --host=$DBHOST --dbname stub \
     --username=$DBUSER --no-password \
     --command="CREATE DATABASE $DBNAME WITH OWNER $DBUSER"
fi

mv ~/.pgpass.bak ~/.pgpass
