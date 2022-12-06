rm -r documentation/markdown
mkdir documentation/markdown

#===========================================
#API
mkdir documentation/markdown/API
widdershins -e API/widdershins.json API/openapi.yaml -o documentation/markdown/API/APIv1.md

#===========================================
#Lambdas
mkdir documentation/markdown/lambdas
mkdir documentation/markdown/lambdas/API
mkdir documentation/markdown/lambdas/Cognito
mkdir documentation/markdown/lambdas/CloudWatch
mkdir documentation/markdown/lambdas/EventBridge
mkdir documentation/markdown/lambdas/S3
mkdir documentation/markdown/lambdas/SNS


#Lambdas API
FILES=lambdas/API/*.js
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .js`
  
#  echo "{{>docs}}" > "lambdas.hbs"
#  echo "{{#class name=\"${NAME}\"}}{{>docs}}{{/class}}" > "lambdas.hbs"
  # take action on each file. $f store current file name
  jsdoc2md -f $f  > documentation/markdown/lambdas/API/$NAME.md
done

#Lambdas SNS
FILES=lambdas/SNS/*.js
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .js`
  
  # take action on each file. $f store current file name
  jsdoc2md -f $f  > documentation/markdown/lambdas/SNS/$NAME.md
done

#Lambdas Cognito
FILES=lambdas/Cognito/*.js
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .js`
  
  # take action on each file. $f store current file name
  jsdoc2md -f $f  > documentation/markdown/lambdas/Cognito/$NAME.md
done

#Lambdas CloudWatch
FILES=lambdas/CloudWatch/*.js
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .js`
  
  # take action on each file. $f store current file name
  jsdoc2md -f $f  > documentation/markdown/lambdas/CloudWatch/$NAME.md
done

#Lambdas EventBridge
FILES=lambdas/EventBridge/*.js
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .js`
  
  # take action on each file. $f store current file name
  jsdoc2md -f $f  > documentation/markdown/lambdas/EventBridge/$NAME.md
done

#Lambdas S3
FILES=lambdas/S3/*.js
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .js`
  jsdoc2md -f $f  > documentation/markdown/lambdas/S3/$NAME.md
done

#===========================================
#Lambdas Model
  jsdoc2md -f lambdas/API/model/*.js > documentation/markdown/lambdas/model.md

#===========================================
#Scripts
mkdir documentation/markdown/scripts

if [ ! -f documentation/shdoc.zip ]; then
    echo "File not found!"
    curl -o documentation/shdoc.zip -L https://github.com/reconquest/shdoc/archive/master.zip
    unzip -u documentation/shdoc.zip -d documentation
fi

GAWKPATH=$(which gawk)
echo "GAWKPATH=$GAWKPATH"

sed -i "" "s!/usr/bin/gawk!$GAWKPATH!g" documentation/shdoc-master/shdoc

echo "This is shell scripts documentation" > documentation/markdown/index.md

for filename in scripts/*.sh; do
  NAME=`basename $filename .sh`
  documentation/shdoc-master/shdoc < $filename > documentation/markdown/scripts/$NAME.md
done

#=========================================
#Cloudformation templates
mkdir documentation/markdown/cloudformation

FILES=resources/cf-*.yaml
for f in $FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .yaml`
  
  # take action on each file. $f store current file name
  cfn-docs $f > documentation/markdown/cloudformation/$NAME.md
done


#========================================
#=======================================
#generating mkdocs.yml
echo "Documentation home" > documentation/markdown/index.md

cat > documentation/mkdocs.yml <<-EOF
site_name: Openexpo documentation
theme: material
docs_dir: ./markdown
site_dir: ./site
use_directory_urls: false
markdown_extensions:
  - sane_lists
nav:
  - Home: 'index.md'
EOF

#API
echo "  - OpenAPI: API/APIv1.md" >> documentation/mkdocs.yml

#API
echo "  - Lambdas model: lambdas/model.md" >> documentation/mkdocs.yml

#Lambdas API
echo "  - Lambdas API:" >> documentation/mkdocs.yml

ROOT=documentation/markdown
FILES=lambdas/API/*.md
for f in $ROOT/$FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .md`

  echo "    - $NAME.js: lambdas/API/$NAME.md" >> documentation/mkdocs.yml
done

#Lambdas SNS
echo "  - Lambdas SNS:" >> documentation/mkdocs.yml
FILES=lambdas/SNS/*.md
for f in $ROOT/$FILES; do
  NAME=`basename $f .md`
  echo "    - $NAME.js: lambdas/SNS/$NAME.md" >> documentation/mkdocs.yml
done

#Lambdas Cognito
echo "  - Lambdas Cognito:" >> documentation/mkdocs.yml
FILES=lambdas/Cognito
for f in $ROOT/$FILES/*.md; do
  NAME=`basename $f .md`
  echo "    - $NAME.js: $FILES/$NAME.md" >> documentation/mkdocs.yml
done

#Lambdas CloudWatch
echo "  - Lambdas CloudWatch:" >> documentation/mkdocs.yml
FILES=lambdas/CloudWatch
for f in $ROOT/$FILES/*.md; do
  NAME=`basename $f .md`
  echo "    - $NAME.js: $FILES/$NAME.md" >> documentation/mkdocs.yml
done

#Lambdas S3
echo "  - Lambdas S3:" >> documentation/mkdocs.yml
FILES=lambdas/S3
for f in $ROOT/$FILES/*.md; do
  NAME=`basename $f .md`
  echo "    - $NAME.js: $FILES/$NAME.md" >> documentation/mkdocs.yml
done

#Lambdas EventBridge
echo "  - Lambdas EventBridge:" >> documentation/mkdocs.yml
FILES=lambdas/EventBridge
for f in $ROOT/$FILES/*.md; do
  NAME=`basename $f .md`
  echo "    - $NAME.js: $FILES/$NAME.md" >> documentation/mkdocs.yml
done


#Scripts
echo "  - Scripts:" >> documentation/mkdocs.yml

FILES=scripts/*.md
for f in $ROOT/$FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .md`

  echo "    - $NAME.sh: scripts/$NAME.md" >> documentation/mkdocs.yml
done

#Cloudformation
echo "  - Cloudformation templates:" >> documentation/mkdocs.yml

FILES=cloudformation/*.md
for f in $ROOT/$FILES
do
  echo "Processing $f file..."
  NAME=`basename $f .md`

  echo "    - $NAME.yaml: cloudformation/$NAME.md" >> documentation/mkdocs.yml
done

cd documentation
mkdocs build
