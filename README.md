# Openexpo

### Preconfiguration
0. run ./01-set-domain.sh to configure your domain on a project.
1. configure ./aws/config to have new profile for your project
1. run ./02-aws-profile.sh to configure all scripts to run in this profile.

### Initial setup

1. you should set up Secrets per environment (dev|prod)
   1. \<env>/zoomintegration: {"secret":"\<zoom secret>","key":"\<zoom key>"}
   
        This is if you plan zoom integration. You will get credentials from Zoom developer account.
   2. \<env>/messengerpeople: {"secret":"\<secret>","verificationToken":"\<token>","bearer":"\<bearer>","telegramIdentifier":"\<telegram channel identifier>"}
      
      This is for social networks notifications using Messengerpeople integrations https://app.messengerpeople.dev/
      When set up, connected users will receive announcements to their Telegram app
   3. \<env>/twilio: {"chat_api_key":"\<chat_api_key>","chat_api_secret":"\<chat_api_secret>","chat_servicesid":"\<chat_setvicesid>","chat_accountsid":"\<chat_accountsid>","auth_token":"\<twilio_authtoken>"}
   
      This one is for chat fnctionality on the platform. We base chats on Twilio Chat technology
   4. \<domain name>/database: {"username":"\<username>","password":"\<password>","engine":"postgres","host":"\<host>","port":"5432","dbname":"\<database name>"}
      You can also use "localhost" for domain and configure it to AWS dev RDS db - so you can run site locally

2. you should set up texorigins table in DynamoDB, with the following columns
   "origindomain","apidomain","binarydomain","bucket","environment","userpool"
    Several domains can point to the same environment, e.g. localhost and dev.openexpo.com. In that case we expect them to have same settings
      
   Example:

3. You need to have the following parameters set in AWS SSM Parameter Store. You should have dev domains listed along with production ones. We suggest you add /<localhost> also in case of local development within dev environment, as domain resolution comes from user requests:
   4. name: //<enter_your.domain>/moderators
      - value: comma-separated emails
      - meaning: list of moderators to approve new event after publishing
   5. name: //<enter_your.domain>/sender
       - value: sender email address, registered with SES
       - meaning: single email to nem sender

 
```
"localhost","apidev.openexpo.com","binary-dev.openexpo.com","tex-binary-dev","dev","eu-central-1_someid" 
"dev.openexpo.com","apidev.openexpo.com","binary-dev.openexpo.com","tex-binary-dev","dev","eu-central-1_someid"
```

3. You should prepare `openexpo` profile with your credentials for AWS CLI. All automations are set to use this profile.

4. You should create AWS SSL certificate in proper regions for your domain. Use that in parameters while deployment.

6. Create repo with the code, if you hadn'd done it yet. You will bind ebhooks to Amplify CICD

7. Create Amplify project for UI hosting. You will need that value for in UI configs. You will need to feed `amplify.yml` and `amplifyCustomHttp.yml` files in the project root to Amplify project settings to have CICD and routing set up.



### Deployment
Deployment is done in `resources` folder, where CloudFormation templates reside.
Deployment files are numbered and ordered, (almost) each can deploy and update template. Some resources are per-account, so they do not separate between environments. 
For example, we reuse RDS for cost optimization.
Deployment resources expect you use one of the two environments: dev|prod. Otherwise, you hould update templates.

Before proceeding you better grep for `enter_your.domain` string in the code and replace it with you primary domain name.

1. Update parameter files for your values (domain names, certificates, prefixes) 
2. Run all shell scripts in `resources` folder in order. If required, update parameter files with your values.
3. Create DynamoDB `texorigins` table. You may use `scripts/dynamodb-create-origins-table.sh` for that
4. Some of templates will create resources that you need to inject into `texorigins` table in DynamoDB. E.g. user pool id. You may use `scripts/dynamodb-add-origin.sh` file to add an origin record
5. If you need database with different name, use `scripts/rds-create-database.sh` for that. Mind that you need to have PSql installed and paths are update in the script.
6. Check thata you have `<domain>/database` secret filled for database connection.
7. Fill the database with tables, running `database/migrate.sh`
8. Initiate database basic dictionaries running `api-cli-setup-origin.sh`. NB: we hadn't run this for a while, so it may fail to insert or authorize. Basically, the script uses administrative OAuth token for a special lambda for value injection to database.
You should check that `lowlevel` application is creted in Cognito.

For that, you may also need to run `scripts/cognito-add-userpool.sh`, that runs addtional CloudFormation template `scripts/cf-cognito-addon.yaml`, creating required applications in Cognito.

9. upload all of SES templates from `lambdas/templates` using `scripts/ses-create-template.sh`
10. Configure SES manually if you want to receive emails
11. Deploy API Gateway definitions initiated with proper log retention and listeners, using `scripts/backend-rollout-api-complete.sh`. Each time you update OpenAPI definitions, you may run this file without redeploying CF template. If you update lambda contents, you need to redeploy CF template then.

### Post-deployment configuration

Don't forget to:
1. Create and upload logo in publicly accessible resource, so it can be used in email templates. Patch them up accordingly in `lambdas/templates`. Reupload templates if required.
2. Templates are also in `lambdas/Cognito/resources`, those are used for registration. Patch them for a logo.
3. Update social networ links (search for `twitter` in the code)
4. If required, create auth domain in Cognito to manage external authentication (e.g. via LinkedIn). You should use AWS managed certificate for your domain.



### Elasticseach deployment
1. Currently, ES is not used in lambdas as we have `tex-es-endpoint` reference disabled.
2. Currently, we do not have separate es deployment between dev and prod environments.
3. But if you like you can enable that in Cloudformation templates, and search capabilities will start working. Search indexing done on entity create/update/delete operations with the separate pipeline, grepping Cloudfront logs for a specific markers on what should be indexed.

### Quicksite configurations
Currently we have pipeline that gathers statistics on lambda execution from Cloudfront logs and stores those in Timestream. That includes response status, execution times and caller usernames
You can visualize it in Quicksite with the custom dashboards.


### Toolset
Node version: 16
Deployment node version: 12. Possibly ugradable to 16 with n issue, lambdas should be updated



###### CLI scripts

- bash
- curl
- jq
- httpie
- AWS CLI

###### Helpers

- https://github.com/a-ostretsova/cognitocurl.git - for transparent authentication. From CLI scripts

- Python 3 + pip
- https://github.com/awslabs/aws-cfn-template-flip - for CF templates conversion

###### Documentation part:

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


### Domain configuration
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


### Best wishes
The code is fully functional, although not configured. Given some patience you can restore it in the full. Anyway, we should be around to help with guidance.
Openexpo team.
