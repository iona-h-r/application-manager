# システムアーキテクチャ

### 1. アーキテクチャ図

#### 1.1 全体像
```mermaid
flowchart TB

    User[一般ユーザー]
    Admin[管理者]

    subgraph Frontend
        CloudFront["CloudFront\n（地域制限: JP）"]
        S3["S3\nReact SPA (Vite)"]
        Cognito["Cognito User Pool\n(Admin グループ)"]
    end

    subgraph Backend
        APIGateway["API Gateway (HTTP API)\nJWT Authorizer"]
        Lambda["Lambda (Python 3.12)\n機能ごとに1関数"]
        DynamoDB[("DynamoDB\napplications / admin-jobs")]
        SES["Amazon SES"]
    end

    User --> CloudFront
    Admin --> CloudFront
    User -.認証.-> Cognito
    Admin -.認証.-> Cognito

    CloudFront --> S3

    S3 -->|"JWT (ID Token)"| APIGateway
    APIGateway -->|JWT Authorizer 検証| Lambda

    Lambda --> DynamoDB
    Lambda --> SES

    SES -.応募通知メール.-> Admin
```

#### 1.2 サービス連携のシーケンス図
```mermaid
sequenceDiagram

    actor Admin as 管理者
    actor User as 一般ユーザー

    participant Cognito
    participant API as API Gateway
    participant Lambda
    participant DDB as DynamoDB
    participant SES as Amazon SES

    Note over Cognito: 管理者アカウントは事前登録済み(Admin Group)

    User->>Cognito: サインアップ
    Cognito-->>User: 登録完了

    User->>Cognito: ログイン
    Cognito-->>User: JWT発行

    User->>API: 応募登録
    API->>Lambda: 応募処理
    Lambda->>DDB: 応募情報保存

    Lambda->>SES: 通知メール送信
    SES-->>Admin: 応募通知

    Admin->>Cognito: ログイン
    Cognito-->>Admin: JWT発行

    Admin->>API: 応募者検索
    API->>Lambda: 検索処理
    Lambda->>DDB: 応募者取得
    DDB-->>Lambda: 応募者情報

    Lambda-->>API: 検索結果
    API-->>Admin: 応募者情報表示
```

---

## 2. 技術スタック

| Category | Technology |
| :--- | :--- |
| Frontend | React, TypeScript |
| Authentication | Amazon Cognito |
| API | API Gateway |
| Backend | AWS Lambda |
| Database | DynamoDB |
| Mail | Amazon SES |
| Hosting | S3, CloudFront |

---

## 3. 認証方式

* **方式**：Amazon Cognito User Pool + JWT（ID トークン）
* **サインアップ**：メールアドレス／パスワードで登録。`email` 属性を自動検証対象としており、確認コードがメールで送付される（Cognito 標準フロー）
* **ログイン**：`amazon-cognito-identity-js` の SRP 認証フロー（`ALLOW_USER_SRP_AUTH`）を使用
* **トークン有効期限**：ID/Access トークン 60 分、Refresh トークン 7 日
* **権限管理**: `Admin` Cognito グループに所属するユーザーのみ管理者機能を利用可能 **（手動で追加要）**
* **ローカル開発時**：`SKIP_AUTH=true` を設定すると Lambda 側の認可チェックをスキップできる（SAM Local 専用）

---

## 4. インフラ構成

* **本番環境**：Terraform（HCL）で全リソースを一元管理。SAM は使用しない
* **ローカル開発環境**：AWS SAM Local（API Gateway + Lambda エミュレーション）+ Docker（DynamoDB Local, dynamodb-admin）
* **CI/CD**：GitHub Actions
  * `terraform.yml`：本番ブランチへのマージ時に `plan` → `apply` を自動実行（OIDC で AWS 認証）
  * `frontend-deploy.yml`：本番ブランチへのマージ時にフロントエンドをビルドし S3 へ同期、CloudFront キャッシュを無効化
* **環境分離**：現状は単一環境（`environment = "prod"`）。`var.environment` により命名規則上は他環境追加が可能な設計


詳細なフォルダ構成・ローカル開発手順は [README.md](../README.md) を参照。
