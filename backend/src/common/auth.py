import json
import os
import urllib.request


COGNITO_REGION = os.environ.get('COGNITO_REGION', os.environ.get('AWS_REGION', 'ap-northeast-1'))
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')
COGNITO_CLIENT_ID = os.environ.get('COGNITO_CLIENT_ID')

_JWKS_CACHE = None


def _get_jwt_module():
    try:
        import jwt
        return jwt
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "PyJWT is required for token verification but is not installed. "
            "Add 'PyJWT[crypto]' to requirements.txt and rebuild."
        ) from exc


def get_claims(event):
    """Extract claims from API Gateway REST/HTTP API authorizer context."""
    authorizer = event.get('requestContext', {}).get('authorizer', {})

    claims = authorizer.get('claims')
    if isinstance(claims, dict):
        return claims

    jwt_claims = authorizer.get('jwt', {}).get('claims', {})
    if isinstance(jwt_claims, dict):
        return jwt_claims

    return {}


def get_groups(claims):
    # Cognito では通常 `cognito:groups` だが、環境によって `groups` に入ることがある。
    groups_raw = claims.get('cognito:groups')
    if groups_raw is None:
        groups_raw = claims.get('groups', '')

    if isinstance(groups_raw, list):
        return [str(g).strip() for g in groups_raw if str(g).strip()]

    raw = str(groups_raw).strip()
    if not raw:
        return []

    # "[Admin]" や "['Admin']" / '["Admin","Ops"]' のような文字列化配列に対応
    if raw.startswith('[') and raw.endswith(']'):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(g).strip() for g in parsed if str(g).strip()]
        except Exception:
            inner = raw[1:-1].strip()
            if not inner:
                return []
            return [
                g.strip().strip("\"'")
                for g in inner.split(',')
                if g.strip().strip("\"'")
            ]

    return [g.strip() for g in raw.split(',') if g.strip()]


def has_group(claims, required_group):
    normalized_required = str(required_group).strip().lower()
    normalized_groups = {g.strip().lower() for g in get_groups(claims)}
    return normalized_required in normalized_groups


def is_admin_event(event):
    if os.environ.get('SKIP_AUTH') == 'true':
        return True
    return has_group(get_claims(event), 'Admin')


def get_user_sub(claims, local_fallback=None):
    if os.environ.get('SKIP_AUTH') == 'true' and local_fallback is not None:
        return local_fallback
    user_sub = str(claims.get('sub') or '').strip()
    return user_sub or None


def _get_jwks():
    global _JWKS_CACHE
    if _JWKS_CACHE is not None:
        return _JWKS_CACHE

    if not COGNITO_USER_POOL_ID:
        raise RuntimeError('COGNITO_USER_POOL_ID is not set')

    jwks_url = (
        f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/'
        f'{COGNITO_USER_POOL_ID}/.well-known/jwks.json'
    )

    with urllib.request.urlopen(jwks_url, timeout=5) as res:
        _JWKS_CACHE = json.loads(res.read().decode('utf-8'))

    return _JWKS_CACHE


def _find_key(kid):
    jwt = _get_jwt_module()
    jwks = _get_jwks()
    for key in jwks.get('keys', []):
        if key.get('kid') == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    return None


def extract_bearer_token(event):
    headers = event.get('headers') or {}
    auth_header = headers.get('Authorization') or headers.get('authorization')
    if not auth_header:
        return None

    parts = auth_header.split(' ', 1)
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None

    return parts[1].strip()


def verify_cognito_id_token(token):
    jwt = _get_jwt_module()
    if not token:
        raise PermissionError('Missing bearer token')
    if not COGNITO_USER_POOL_ID:
        raise RuntimeError('COGNITO_USER_POOL_ID is not set')
    if not COGNITO_CLIENT_ID:
        raise RuntimeError('COGNITO_CLIENT_ID is not set')

    unverified = jwt.get_unverified_header(token)
    key = _find_key(unverified.get('kid'))
    if not key:
        raise PermissionError('Token key not found')

    issuer = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}'

    claims = jwt.decode(
        token,
        key,
        algorithms=['RS256'],
        audience=COGNITO_CLIENT_ID,
        issuer=issuer,
    )

    if claims.get('token_use') != 'id':
        raise PermissionError('Only Cognito ID token is accepted')

    return claims


def require_auth(event, required_group=None):
    token = extract_bearer_token(event)
    claims = verify_cognito_id_token(token)

    if required_group:
        if not has_group(claims, required_group):
            raise PermissionError(f'Requires group: {required_group}')

    return claims
