# 開発者ガイド

## 開発・運用環境

| 役割 | ツール |
| :--- | :--- |
| **IaC (本番)** | Terraform |
| **Local開発** | AWS SAM, Docker (DynamoDB Local)|

---

## フォルダ構成
```text
/application-manager
├── docker-compose.yml              # ローカル開発用：DynamoDB + DynamoDB-Admin
├── frontend/                       # React ソースコード
│   ├── index.html                  # アプリのエントリーHTML。<div id="root"> に React をマウント
│   ├── package.json                # 依存ライブラリ・スクリプト定義
│   ├── vite.config.js              # Vite ビルド設定。Node polyfills と Cognito SDK 向け global 定義
│   ├── tailwind.config.js          # Tailwind CSS 設定
│   ├── postcss.config.js           # PostCSS 設定。Tailwind と autoprefixer を適用
│   ├── .env.example                # 環境変数のテンプレート
│   └── src/
│       ├── index.css               # グローバルスタイル
│       ├── main.jsx                # ルートコンポーネント
│       ├── lib/
│       │   ├── cognitoConfig.js    # Cognito 接続設定
│       │   └── api.js              # axios 共通クライアント
│       ├── components/             # 共通のパーツ
│       └── pages/                  # 各画面
│
├── backend/                        # Lambdaロジックと依存関係
│   ├── requirements.txt            # 依存ライブラリ集約 (boto3など)
│   └── src/                        # Lambdaソースコード
│       ├── common/                 # 共通ロジック (DB接続、SES送信等)
│       └── functions/              # 個別ロジック
│
├── sam/                            # ローカル開発用Lambda ApiGw定義
└── terraform/                      # 本番用インフラ定義 (HCL)
```

---

## ローカル開発手順
> **前提**: `sam` CLI・Docker・Node.js・npm がインストールされていること。

1. Docker の DynamoDB Local を起動:

```bash
docker compose up -d dynamodb-local dynamo-admin
chmod +x ./scripts/init-dynamodb.sh
./scripts/init-dynamodb.sh
```

2. バックエンド (SAM Local API) をビルド・起動:

```bash
cd sam
sam build
sam local start-api --template template.yaml --port 3002 --env-vars local-env.json
```

`local-env.json` は `sam/` ディレクトリに配置してください。
この設定では `DYNAMO_ENDPOINT=http://host.docker.internal:8000` が適用され、
SAM Local から Docker の `dynamodb-local` を参照します。

3. フロント環境変数を設定:

```bash
cd ../frontend
cp .env.example .env.local
```

`.env.local` の `VITE_API_ENDPOINT` を `http://localhost:3002` に設定します。

4. フロントを起動:

```bash
cd frontend
npm install
npm run dev
# ブラウザで http://localhost:5173/admin を開く
```

5. API 動作確認 (別ターミナル):

ローカルでは認証スキップ (`SKIP_AUTH=true`) のため、Authorization ヘッダーは不要です。

```bash
# 応募登録
curl -s -X POST http://127.0.0.1:3002/applications \
    -H 'Content-Type: application/json' \
    -d '{"jobTitle":"React開発案件","applicantName":"テスト太郎","rating":4.9,"achievementCount":120,"proposalAmount":50000,"proposalContent":"応募内容"}' | jq

# 管理者一覧
curl -s http://127.0.0.1:3002/admin/applications | jq

# 管理者詳細
curl -s http://127.0.0.1:3002/admin/applications/<APPLICATION_ID> | jq
```

---

## テストデータ投入

ページネーション確認や、管理者目線・ユーザー目線の表示確認には
[scripts/seed_test_data.py](scripts/seed_test_data.py) を使用します。

このスクリプトは以下を作成します。

* 管理者目線データ: 自分の求人 + 他管理者の求人
* ユーザー目線データ: 自分の応募 + 他ユーザーの応募

デフォルトではそれぞれ 25 件ずつ作成されます。

```bash
# デフォルト投入（自分25件/他人25件）
python scripts/seed_test_data.py --my-user-id local-user-001

# 管理者IDを分ける場合
python scripts/seed_test_data.py --my-user-id local-user-001 --my-admin-id local-admin

# 件数を明示指定する場合
python scripts/seed_test_data.py \
    --my-user-id local-user-001 \
    --my-job-count 25 \
    --other-job-count 25 \
    --my-application-count 25 \
    --other-application-count 25
```

主なオプション:

* `--my-user-id` (必須): 自分の応募者ID
* `--my-admin-id` (任意): 自分の管理者ID（未指定時は `--my-user-id` と同じ）
* `--endpoint-url` (任意): DynamoDB エンドポイント（既定: `http://localhost:8000`）
* `--admin-jobs-table` / `--applications-table` (任意): テーブル名の上書き

---

## 本番デプロイ (Terraform 完結)

本番環境は SAM を使わず、Terraform で完結します。
SAM はローカル開発専用です。

### 事前準備（初回デプロイ時のみ）

1. Terraform State 用の S3 バケットと DynamoDB ロックテーブルを作成
1. GitHub Actions 用に AWS OIDC ロールを作成
1. GitHub Secrets を登録

必要な GitHub Secrets:

* `AWS_ROLE_TO_ASSUME`
* `SES_FROM_ADDRESS`
* `SES_ADMIN_ADDRESS`

### CI/CD

* `.github/workflows/terraform.yml`
    * prd マージ時に Terraform `plan` + `apply` を自動実行
* `.github/workflows/frontend-deploy.yml`
    * prd マージ時に frontend を build し S3 へ同期
    * CloudFront invalidation を実行
    * Terraform output から frontend 用環境変数を注入
