#!/usr/bin/env bash

export VAULT_ADDR=https://vault-private-vault-398033d3.293cca67.z1.hashicorp.cloud:8200
export VAULT_NAMESPACE=admin
# vault login -method=oidc -path=azure-iodc role=vault-cloud-admins
export MOBILE_OS="android" #android|ios
export CLIENT="cheers"
export PROJECT="djaayz"
export AZDO_PROJECT="HeyDJ"
export AZDO_ORG="CheersApp"
export AZDO_PIPELINE_ID="1" # staging
export SHORT_SHA=$(git rev-parse --short=8 HEAD)
export AZURE_DEVOPS_EXT_PAT=$(vault kv get -field=token secret/azure/heydj/azure-devops/prod/api )
export AWS_ACCESS_KEY_ID=$(vault kv get -field=key secret/aws/heydj/devicefarm/prod/api )
export AWS_SECRET_ACCESS_KEY=$(vault kv get -field=secret secret/aws/heydj/devicefarm/prod/api )
export AWS_DEFAULT_REGION="us-west-2"
if [ "${MOBILE_OS}" == "ios" ] ;then
    export ARTIFACT_TYPE="ipa" # apk|ipa
    export ARTIFACT_UPLOAD_TYPE="TO_FIND"
    cat >device_criteria.json<< EOF
{
      "attribute": "PLATFORM",
        "operator": "EQUALS",
        "value": "IOS"
},
{
    "attribute": "AVAILABILITY",
    "operator": "EQUALS",
    "value": "\"AVAILABLE\""
}
EOF
elif [ "${MOBILE_OS}" == "android" ] ;then
    export ARTIFACT_TYPE="apk"
    export ARTIFACT_UPLOAD_TYPE="ANDROID_APP"
    cat >device_criteria.json<< EOF
{
      "attribute": "PLATFORM",
        "operator": "EQUALS",
        "value": "ANDROID"
},
{
    "attribute": "AVAILABILITY",
    "operator": "EQUALS",
    "value": "\"AVAILABLE\""
}
EOF

fi
export TEST_SPEC_FILE_PATH="aws-${MOBILE_OS}.yaml"
export PROJECT_ARN="arn:aws:devicefarm:us-west-2:810733428226:project:02b0f340-81a4-4e36-994b-e84e2413d647"
export POOL_NAME="devicepool-${MOBILE_OS}-${CLIENT}-${PROJECT}-${SHORT_SHA}"
export POOL_DESCRIPTION="${MOBILE_OS} device pool for testing Android mobile apps on ${CLIENT}/${PROJECT}over git sha ${SHORT_SHA}"
export RUN_NAME="run-${MOBILE_OS}-${CLIENT}-${PROJECT}-${SHORT_SHA}"
export TIMEOUT_MINUTES=30



# login into azure devops
echo  "${AZURE_DEVOPS_EXT_PAT}" | az devops login --organization https://dev.azure.com/${AZDO_ORG}/
az devops configure --defaults project=${AZDO_PROJECT} organization=https://dev.azure.com/${AZDO_ORG}/
git config --global credential.helper store
echo "https://azure:${AZURE_DEVOPS_EXT_PAT}@dev.azure.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

# create test artifact
find . -path '*'${CLIENT}'/'${PROJECT}'*' | zip -@ tests.qa.${SHORT_SHA}.zip
export ZIP_FILE_PATH="tests.qa.${SHORT_SHA}.zip"

# get the latest succesful run artifact
# TODO: get the artifact from git sha vs last succesful
azdo_pipeline_last_successfull_run=$(az pipelines runs list --pipeline-id ${AZDO_PIPELINE_ID} --query "[?result=='succeeded']" --top 1  | jq '.[].id')
az pipelines runs artifact download --run-id ${azdo_pipeline_last_successfull_run} --artifact-name ${ARTIFACT_TYPE} --path ./${CLIENT}.${PROJECT}.${ARTIFACT_TYPE}
export APP_FILE_PATH="$(ls -1 ./${CLIENT}.${PROJECT}.${ARTIFACT_TYPE}/*.${ARTIFACT_TYPE})"


# aws devicefarm upload app
# Upload app to Device Farm
APP_UPLOAD=$(aws devicefarm create-upload \
    --project-arn $PROJECT_ARN \
    --name $(basename $APP_FILE_PATH) \
    --type "${APP_UPLOAD_TYPE}" \
    --output json)
APP_ARN=$(echo $APP_UPLOAD | jq -r '.upload.arn')
APP_URL=$(echo $APP_UPLOAD | jq -r '.upload.url')
curl -T $APP_FILE_PATH $APP_URL
# aws devicefarm upload test spec
# Upload test spec to Device Farm
TEST_SPEC_UPLOAD=$(aws devicefarm create-upload \
    --project-arn $PROJECT_ARN \
    --name $(basename $TEST_SPEC_FILE_PATH) \
    --type "APPIUM_JAVA_TESTNG_TEST_SPEC" \
    --output json)
TEST_SPEC_ARN=$(echo $TEST_SPEC_UPLOAD | jq -r '.upload.arn')
TEST_SPEC_URL=$(echo $TEST_SPEC_UPLOAD | jq -r '.upload.url')
curl -T $TEST_SPEC_FILE_PATH $TEST_SPEC_URL
# aws devicefarm upload test files
# Upload test file to Device Farm
ZIP_UPLOAD=$(aws devicefarm create-upload \
    --project-arn $PROJECT_ARN \
    --name $(basename $ZIP_FILE_PATH) \
    --type "APPIUM_PYTHON_TEST_PACKAGE" \
    --output json)
ZIP_ARN=$(echo $ZIP_UPLOAD | jq -r '.upload.arn')
ZIP_URL=$(echo $ZIP_UPLOAD | jq -r '.upload.url')
curl -T $ZIP_FILE_PATH $ZIP_URL
# create device pool for android & ios
DEVICE_POOL_RESULT=$(aws devicefarm create-device-pool \
  --project-arn $PROJECT_ARN \
  --name "$POOL_NAME" \
  --description "$POOL_DESCRIPTION" \
  --rules "$(cat device_criteria.json)" \
  --output json)
export DEVICE_POOL_ARN=$(echo $DEVICE_POOL_RESULT | jq -r '.devicePool.arn')

# aws devicefarm schedule-run
# Start Device Farm run and wait for it to complete
run_result=$(aws devicefarm schedule-run \
    --project-arn $PROJECT_ARN \
    --app-arn $APP_ARN \
    --device-pool-arn $DEVICE_POOL_ARN \
    --name "$RUN_NAME" \
    --test testSpecArn=$TEST_SPEC_ARN,testPackageArn=$ZIP_ARN,type=APPIUM_PYTHON \
    --execution-configuration jobTimeoutMinutes=$TIMEOUT_MINUTES \
    --output json)
export run_arn=$(echo $run_result | jq -r '.run.arn')
echo "Device Farm run started with ARN: $run_arn"
echo "Waiting for test execution to complete..."

# loop over aws devicefarm get-run
# Poll the status of the run until it completes
while true
do
    run_result=$(aws devicefarm get-run --arn $run_arn --output json)
    status=$(echo $run_result | jq -r '.run.status')
    if [ $status = "COMPLETED" ]; then
        break
    elif [ $status = "STOPPED" ] || [ $status = "FAILED" ] || [ $status = "ERRORED" ]; then
        echo "Device Farm run failed with status: $status"
        exit 1
    fi
    echo "Current status: $status"
    sleep 2
done
echo "Test execution completed successfully!"

# aws devicefarm list list-artifacts
# Get details of Device Farm run and save to file
aws devicefarm get-run \
    --arn $run_arn \
    --output json > runDetails.json

# get artifact with: customer artifact => download this folder from AWS
# Download artifacts from Device Farm run
ARTIFACTS_URL=$(jq -r '.run.artifactsUrl' runDetails.json)
curl -O $(aws devicefarm list-artifacts --arn $run_arn --type FILE --query "artifactList[].url" --output text)

# Print success message
echo "Device Farm run artifacts downloaded successfully!"
# unzip allure result & baseline

# generate allure result as usual
# push baseline to GIT
