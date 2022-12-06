#Unit test suite

##### Run-up
1. Download flyway image:
(Linux only) Download, extract and install by adding to PATH (requires sudo permissions):
```bash
$ sudo sh -c 'echo "docker run --rm flyway/flyway:7.14.0 $*" > /usr/local/bin/flyway && chmod +x /usr/local/bin/flyway'
```
(All platforms) Or simply download the image:
```bash
> docker pull flyway/flyway:7.14.0
```

2. Download Postgresql image:
(All platforms) Or simply download the image:
```bash
> docker pull postgres
```

3. Create docker-compose.yml: 
    ```
    version: '3'
    services:
    flyway:
        image: flyway/flyway
        command: clean migrate
        #command: validate
        environment:
        - FLYWAY_URL=jdbc:postgresql://172.18.0.2:5432/postgres
        - FLYWAY_USER=postgres
        - FLYWAY_PASSWORD=password
        - FLYWAY_MIXED=false
        - FLYWAY_CONNECT_RETRIES=60
        volumes:
        - [path-to-versions-directory]:/flyway/sql
        depends_on:
        - db
    db:
        image: postgres
        environment:
        - POSTGRES_PASSWORD=password
        ports:
        - 5432:5432
    ```
instead past path absolute path to flyway versions directory.
For example: /mnt/d/webDevelop/Node.js Projects/openexpo/database/versions/

4. Go to the tests directory and install all dependencies:
```bash
$ npm install
```

5. Add .env file with local postgresql credentials
Default values:

PGHOST=localhost
PGUSER=postgres
PGDATABASE=postgres
PGPASSWORD=password
PGPORT=5432

##### Testing:

1. Run docker-compose file

2. Go to the tests directory and run script:
```bash
$ npm test
```


### If flyway doesn't migrate because unsafe use of new value:
Error like:
**New enum values must be committed before they can be used.**

It's temporary solution, but it works
Add to versions directory config file with name equal to failed migration file and conf extention.
For example:
I got error in V1_0_2__add_sponsorship_tiers.sql 
so my configuration file will be V1_0_2__add_sponsorship_tiers.sql.conf
Add this content:
```
# Manually determine whether or not to execute this migration in a transaction. This is useful for
# databases like PostgreSQL and SQL Server where certain statements can only execute outside a transaction.
executeInTransaction=false
```


