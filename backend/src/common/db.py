import os
import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def get_dynamodb_resource():
    endpoint = os.environ.get('DYNAMO_ENDPOINT')
    region = os.environ.get('AWS_REGION', 'ap-northeast-1')
    logger.info(f"Creating DynamoDB resource region={region} endpoint={endpoint}")
    if endpoint:
        return boto3.resource('dynamodb', region_name=region, endpoint_url=endpoint)
    return boto3.resource('dynamodb', region_name=region)


def get_table_by_env(table_env_var):
    table_name = os.environ.get(table_env_var)
    if not table_name:
        raise RuntimeError(f'Environment variable {table_env_var} is not set')
    return get_dynamodb_resource().Table(table_name)


def get_table():
    # 環境変数で TABLE_NAME が設定されていることを期待する
    return get_table_by_env('TABLE_NAME')
