
docker pull flyway/flyway:7.14.0
docker pull postgres

ifconfig | grep "inet "

echo "your IP (e.g. 192.168.0.2)"
read IP

cat > docker-compose.yml <<-EOF
version: '3'
services:
    flyway:
        image: flyway/flyway
        command: clean migrate
        #command: validate
        environment:
            - FLYWAY_URL=jdbc:postgresql://$IP:5432/postgres
            - FLYWAY_USER=postgres
            - FLYWAY_PASSWORD=password
            - FLYWAY_MIXED=false
            - FLYWAY_CONNECT_RETRIES=60
        volumes:
            - ./../database/versions:/flyway/sql
        depends_on:
            - db
    db:
        image: postgres
        environment:
            - POSTGRES_PASSWORD=password
        ports:
            - 5432:5432
EOF


npm install

cat > .env <<-EOF
PGHOST=localhost
PGUSER=postgres
PGDATABASE=postgres
PGPASSWORD=password
PGPORT=5432
EOF
