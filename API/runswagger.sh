docker pull swaggerapi/swagger-editor
docker run -d -p 8080:8080 -e URL=/foo/swagger.json -v `pwd`:/usr/share/nginx/html/foo swaggerapi/swagger-editor
