# Openexpo

### Preconfiguration
1. Prepare Github repo with the code, if you hadn'd done it yet. You will bind webhooks to Amplify CICD
0. run ./01-set-domain.sh to configure your base domain on a project.
1. configure ./aws/config to have new profile for your project
1. run ./02-aws-profile.sh to configure all scripts to run in this profile.
2. check all Cloudformation parameter files for proper values (esp. database section)
1. run ./03-project-name.sh to replace `openexpo` to your custom project name in resources, e.g. S3 bucket names.
2. run ./04-aws-account.sh to replace `enter_your_aws_account` to your custom AWS account, that is required for proper permissions in different places.

1. create your own domain certificate, or import existing one in AWS Certificate Manager (ACM). You will need it to bind your APIs and static files provisioning. Validate the certificate in AWS if required.
1. run ./05-domain-certificate.sh to inject the cerificate in configurations

### Setup sequence
Deployment is done in `resources` folder, where CloudFormation templates reside.
Deployment files are numbered and ordered, (almost) each can deploy and update template. Some resources are per-account, so they do not separate between environments.
For example, we reuse RDS for cost optimization.
Deployment resources expect you use one of the two environments: dev|prod. Otherwise, you hould update templates.

* `01-auto-set-log-group-retention-dev.sh <env>` 
  * that will get your cloudwatch logs cleaned up after a week
* `02-prerequisites.sh <env>`
  * required entities - permissions, buckets etc.
  * (post-config) you will need to fill proper secrets values
* `03-lamda-layers.sh <env>`
  * lambda layers prerequisites
* `10-cloudformation-create-lambda-delete-s3.sh` 
  * bucket cleanup automation on CF template undeployment. Required for next dependencies.
  * ⚠️Executes once per account
* `20-s3-resources.sh <env>`
  * remaining required S3 buckets
* `25-es.sh <env>`
  * elasticsearch support
  * ⚠️ optional
* `30-rds.sh <env>`
  * database instance setup. Mind that default database is not used on the instance
* `31-database.sh <env>`
  * non-default database creation
* `32-bind-database-enter_your.domain.sh <env>`
  * It is possible, that due to cost-cutting you may have several databases for different environments on a single RDS instance. 
  * So you need to match the web domain with proper database on the instance. That is also needed for multi-domain deployment (e.g. openexpo.fr and openexpo.de)
  * This will create proper secret with connection credentials per domain
* `32-bind-database-localhost.sh <env>`
  * This is working example of routing localhost to dev database - for a local frontend development with dev backend
* `database\migrate.sh <domain>`
  * this will initiate database with the proper tables and initial values.
  * domain is the one you set up on step `32`, for dev environment `localhost` will do.
* `35-sns-sqs.sh <env>`
  * required buses
* `36-timestream.sh <env>`
  * timestream setup for lambda execution logging
  * ⚠️ optional
* `40-amplify.sh <env> <github token>`
  * preconfigured initial amplify setup. Basically, you need only one deployment per project
  *  (post-config) Check Amplify Deployment section below
* `50-cloudfront.sh <env>`
  * s3 routing basically
* `60-cognito.sh <env>`
  * authentication setup and login
* `69-non-api-lambda.sh <env>`
  * backend lambdas fired by non-frontend events
* `70-api-lambda.sh <env>`
  * backend lambdas mapped to API Gateway, along with Gateway itself. Basically, API implementation
* `71-api-domain-com.sh <env>`
  * mapping domain name to API. You will need several configurations per-domain
  * this one is the example, multiply and configure per your need.

### (Post-config) Secret setup

The installation will create several Secrets placeholders, that you need to fulfill. It is related to external integrations.

1. you should set up Secrets per environment (dev|prod)
   1. \<env>/zoomintegration: {"secret":"\<zoom secret>","key":"\<zoom key>"}
   
        This is if you plan zoom integration. You will get credentials from Zoom developer account.
   2. \<env>/messengerpeople: {"secret":"\<secret>","verificationToken":"\<token>","bearer":"\<bearer>","telegramIdentifier":"\<telegram channel identifier>"}
      
      This is for social networks notifications using Messengerpeople integrations https://app.messengerpeople.dev/
      When set up, connected users will receive announcements to their Telegram app
   3. \<env>/twilio: {"chat_api_key":"\<chat_api_key>","chat_api_secret":"\<chat_api_secret>","chat_servicesid":"\<chat_setvicesid>","chat_accountsid":"\<chat_accountsid>","auth_token":"\<twilio_authtoken>"}
   
      This one is for chat fnctionality on the platform. We base chats on Twilio Chat technology

### (Post-config) Amplify deployment
1. install Amplify from Console onto Github, and give it enough permissions to work with your repo ("Reconnect to repository" message).
2. run Amplify template script to install (40-amplify.sh).
3. Go to Amplify console and install webhooks to your repo so all PRs and branch updates are tracked
4. You might need to initiate initial build of the main branch manually.
5. You might need to set up rewrite rules and subscriber notifications on your app.

### (Post-config) redirect domain to AWS
1. you should have 50-cloudfront.sh already executed, and hosted zone for your domain already created
2. https://docs.aws.amazon.com/amplify/latest/userguide/to-add-a-custom-domain-managed-by-a-third-party-dns-provider.html
You may not skip certificate validation if you already created one for your domain nd subdomains
3. You need also add all other subdomains `*` to the same cloudfront distribution as the Amplify app (`www`).



### (Post-config) domain mapping to internal objects

1. Create DynamoDB `texorigins` table. You may use `scripts/dynamodb-create-origins-table.sh` for that
2. Some of templates will create resources that you need to inject into `texorigins` table in DynamoDB. E.g. user pool id. You may use `scripts/dynamodb-add-origin.sh` file to add an origin record

Generally, columns are the following:
   "origindomain","apidomain","binarydomain","bucket","environment","userpool".
    Several domains can point to the same environment, e.g. localhost and dev.openexpo.com. In that case we expect them to have same settings
      
   Example:
```
"localhost","apidev.openexpo.com","binary-dev.openexpo.com","tex-binary-dev","dev","eu-central-1_someid" 
"dev.openexpo.com","apidev.openexpo.com","binary-dev.openexpo.com","tex-binary-dev","dev","eu-central-1_someid"
```

### (Post-config) emailing

3. You need to have the following parameters set in AWS SSM Parameter Store. You should have dev domains listed along with production ones. We suggest you add /<localhost> also in case of local development within dev environment, as domain resolution comes from user requests:
   4. name: //<enter_your.domain>/moderators
      - value: comma-separated emails
      - meaning: list of moderators to approve new event after publishing
   5. name: //<enter_your.domain>/sender
       - value: sender email address, registered with SES
       - meaning: single email to nem sender

4. You should create AWS SSL certificate in proper regions for your domain. Use that in parameters while deployment.

### (Post-config) statics and templates

Don't forget to:
1. Create and upload logo in publicly accessible resource, so it can be used in email templates. Patch them up accordingly in `lambdas/templates`. Reupload templates if required.
2. Templates are also in `lambdas/Cognito/resources`, those are used for registration. Patch them for a logo.
3. Update social networ links (search for `twitter` in the code)
4. If required, create auth domain in Cognito to manage external authentication (e.g. via LinkedIn). You should use AWS managed certificate for your domain.
9. upload all of SES templates from `lambdas/templates` using `scripts/ses-create-template.sh`
10. Configure SES manually if you want to receive emails
11. Deploy API Gateway definitions initiated with proper log retention and listeners, using `scripts/backend-rollout-api-complete.sh`. Each time you update OpenAPI definitions, you may run this file without redeploying CF template. If you update lambda contents, you need to redeploy CF template then.


### (Post-config) Database model preparation

6. Check thata you have `<domain>/database` secret filled for database connection.
7. Fill the database with tables, running `database/migrate.sh`
8. Initiate database basic dictionaries running `api-cli-setup-origin.sh`. NB: we hadn't run this for a while, so it may fail to insert or authorize. Basically, the script uses administrative OAuth token for a special lambda for value injection to database.
You should check that `lowlevel` application is creted in Cognito.

For that, you may also need to run `scripts/cognito-add-userpool.sh`, that runs addtional CloudFormation template `scripts/cf-cognito-addon.yaml`, creating required applications in Cognito.


### (optional) Elasticseach deployment
1. Currently, ES is not used in lambdas as we have `tex-es-endpoint` reference disabled.
2. Currently, we do not have separate es deployment between dev and prod environments.
3. But if you like you can enable that in Cloudformation templates, and search capabilities will start working. Search indexing done on entity create/update/delete operations with the separate pipeline, grepping Cloudfront logs for a specific markers on what should be indexed.

### (optional) Quicksite configurations
Currently we have pipeline that gathers statistics on lambda execution from Cloudfront logs and stores those in Timestream. That includes response status, execution times and caller usernames
You can visualize it in Quicksite with the custom dashboards.


### Toolset
Node version: 16
Deployment node version: 12. Possibly ugradable to 16 with n issue, lambdas should be updated
Python 3.x


###### CLI scripts

- bash
- curl
- jq
- httpie
- AWS CLI
- Node 16
- Python 3.x

###### Helpers

- https://github.com/a-ostretsova/cognitocurl.git - for transparent authentication. From CLI scripts

- Python 3 + pip
- https://github.com/awslabs/aws-cfn-template-flip - for CF templates conversion

###### Documentation build:

1. smartcomments - autogeneration for Javascript comments
   https://smartcomments.github.io/
   
   `npm install -g smartcomments`
   
   `smartcomments --generate`

2. YUIDoc - HTML generation from Javascript comments

   https://yui.github.io/yuidoc/
   
   https://yui.github.io/yuidoc/syntax/index.html
   
   `npm -g install yuidocjs`
   
   (Autodownloads https://github.com/Krxtopher/yuidoc-themes/archive/master.zip for better theming)

4. ReDoc - OpenAPI to HTML compilation

   https://github.com/Redocly/redoc
   
   `npm install -g redoc-cli`
   
   `redoc-cli bundle -o index.html swagger.json`

5. gawk for converting bash script comments to markdown

    `sudo port install gawk` - on MacOS

5. MkDocs - documentation from markdown
   https://www.mkdocs.org/
    
    `sudo pip3 install mkdocs`
    
    `mkdocs build`
    
7. cloudformation-docs 0.3.2 - CloudFormation Template documentation
    https://pypi.org/project/cloudformation-docs/#files
    `sudo pip3 install cloudformation-docs`
    `cfn-docs <template-name> > <markdown-name> && mkdocs build`

8. MkDocs-Material - template
    https://github.com/squidfunk/mkdocs-material
    `pip3 install mkdocs-material`

    update mkdocs.yaml with theme: material

9. mcseemz/widdershins - API documentation compiler, patched
    `git clone https://github.com/mcseemz/widdershins.git`
    `cd widdershins`
    `npm install -g`
    
    usage: `widdershins`

10. jsdoc-to-markdown - javascript doc compiler
    https://github.com/jsdoc2md/jsdoc-to-markdown
    
    `npm install -g jsdoc-to-markdown`


### Frontend domain configuration
 - Setup Amplify using CLI tool https://docs.amplify.aws/cli/teams/overview/ 
   - Choose './UI/amplify' as a directory;
 - !! Recomended !! to set 'dev' prefix for development enviroment in aws Amplify. So every Pull-request previews will fetch development configs.
 - Every envirenment requires its own config file.
 - There is already exists default config and localhost congig (for local)
 - All config files  are in the './UI/configs' directory
 - Follow the naming pattern: <your-enviroment-domain>.json (e.g. dev.openxpo.json)
 - Example of config file.
```json
{
  "routing": "<language (e.g. en_GB, fr_FR)>",
  "lang": "<default language (e.g. en_GB, fr_FR)>",
  "api": "<your API domain>",
  "binary": "<your binary domain>",
  "auth": "<your auth domain>",
  "videoAppKey": "<video App key (e.g. my-video-dev)>",
  "currency": "<currency name (e.g. USD, EUR)>",
  "currencySign": "<currency sign (e.g. $ , €)>",
  "fees": "<amount of fees (e.g. 6.3)>",
  "tax": "<tax percentage  (e.g. 10)>",
  "facebookId": "<facebook integration ID>",
  "intercomId": "<intercom integration ID>",
  "tagMagagerId": "tag manager ID",
  "merchants": [{
    "<payment type as key (e.g. PayPal)>": {
      "url": "<redirect endpoint after succes payment (e.g. [my-domain]/payment/done)>",
      "logo": "<logo icon url>"
      }
    }
  ],
  "amplify": {
    "aws_project_region": "<amplify service region>",
    "aws_cognito_identity_pool_id": "<aws cognito service id>",
    "aws_cognito_region": "<cognito service region>",
    "aws_user_pools_id": "<aws user pool id>",
    "aws_user_pools_web_client_id": "<aws web client id>",
    "oauth": {
      "domain": "<your domain>",
      "scope": ["openid", "profile", "email"],
      "redirectSignIn": "<https://[my-domain]/callback>",
      "redirectSignOut": "<https://[my-domain]>",
      "responseType": "token"
    }
  },
  "features": {
    "sponsors": true,
    "discover": true,
    "video": true,
    "analytics": false,
    "tagManager": false,
    "facebook": false,
    "intercom": true,
    "localization_placeholder": false,
    "errors_notification": true
  },
  "constraints": {
    "home_concert": {
      "audio": {
        "bitrate": 128000,
        "stereo": true
      },
      "video": {
        "width": 1280,
        "height": 720,
        "minBitrate": 1000,
        "maxBitrate": 1500
      }
    },
    "webinar": {
      "audio": {
        "bitrate": 44000,
        "stereo": false
      },
      "video": {
        "width": 480,
        "height": 360,
        "maxBitrate": 500
      }
    },
    "general": {
      "audio": {
        "bitrate": 44000,
        "stereo": false
      },
      "video": {
        "width": 640,
        "height": 480,
        "minBitrate": 500,
        "maxBitrate": 1000
      }
    },
    "screen_sharing": {
      "video": {
        "width": 1920,
        "height": 1080,
        "minBitrate": 2000,
        "maxBitrate": 2000
      }
    }
  }
}
```

### Useful resources
https://github.com/awstut-an-r/awstut-fa/tree/main/062

### Best wishes
The code is fully functional, although not configured. Given some patience you can restore it in the full. Anyway, we should be around to help with guidance.
Openexpo team.
