# DynamoDB テーブル設計書

## 設計方針

本システムでは保守性・可読性・拡張性を重視し、マルチテーブル設計を採用する。

対象テーブル

* admin-jobs（求人管理）
* applications（応募管理）

認証情報は Cognito で管理し、業務データは DynamoDB で管理する。

ユーザー識別にはメールアドレスではなく Cognito の `sub` を使用する。

---

# admin-jobs

## 用途

求人情報管理

## テーブル情報

| 項目    | 値          |
| ----- | ---------- |
| テーブル名 | admin-jobs |
| PK    | id         |
| SK    | なし         |

---

## 項目定義

| 項目名            | 型      | 必須 | 設定方法 | 説明                       | 例                                    |
| -------------- | ------ | -- | ---- | ------------------------ | ------------------------------------ |
| id             | String | ○  | 自動   | 求人ID（主キー）                | JOB-20260624-A1B2C3D4                |
| ownerUserId    | String | ○  | 自動   | 登録管理者ユーザーID（Cognito sub） | 8f3d4f7a-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| createdAt      | String | ○  | 自動   | 作成日時（UTC ISO8601）        | 2026-06-24T01:00:00+00:00            |
| updatedAt      | String | ○  | 自動   | 更新日時（UTC ISO8601）        | 2026-06-24T01:00:00+00:00            |
| jobTitle       | String | ○  | 手動   | 求人タイトル                   | 放射線技師                                |
| company        | String | ○  | 手動   | 企業名・施設名                  | ○○総合病院                               |
| location       | String | ○  | 手動   | 勤務地                      | 北海道札幌市中央区                            |
| employmentType | String | ○  | 手動   | 雇用形態                     | 正社員                                  |
| budget         | Number | ○  | 手動   | 想定年収・予算                  | 5000000                              |
| description    | String | ○  | 手動   | 求人詳細説明                   | MRI・CT撮影業務を担当                        |
| status         | String | ○  | 自動   | 求人状態                     | OPEN / CLOSED                        |
| publishedAt    | String | ○  | 自動   | 公開日時                     | 2026-06-24T01:00:00+00:00            |
| closedAt       | String | △  | 自動   | 募集終了日時                   | 2026-07-31T23:59:59+00:00            |

---

## GSI

### GSI1: 求人一覧取得

| 項目      | 値                      |
| ------- | ---------------------- |
| インデックス名 | status-createdAt-index |
| PK      | status                 |
| SK      | createdAt              |

用途

* 公開中求人一覧
* 新着求人一覧

---

### GSI2: 勤務地検索

| 項目      | 値                        |
| ------- | ------------------------ |
| インデックス名 | location-createdAt-index |
| PK      | location                 |
| SK      | createdAt                |

用途

* 地域別求人検索

---

### GSI3: 雇用形態検索

| 項目      | 値                              |
| ------- | ------------------------------ |
| インデックス名 | employmentType-createdAt-index |
| PK      | employmentType                 |
| SK      | createdAt                      |

用途

* 正社員
* パート
* 派遣

などの検索

---

### GSI4: 管理者別求人一覧

| 項目      | 値                           |
| ------- | --------------------------- |
| インデックス名 | ownerUserId-createdAt-index |
| PK      | ownerUserId                 |
| SK      | createdAt                   |

用途

* 自分が登録した求人一覧
* 管理者別求人一覧

---

# applications

## 用途

応募情報管理

## テーブル情報

| 項目    | 値            |
| ----- | ------------ |
| テーブル名 | applications |
| PK    | id           |
| SK    | なし           |

---

## 項目定義

| 項目名             | 型      | 必須 | 設定方法 | 説明                     | 例                                    |
| --------------- | ------ | -- | ---- | ---------------------- | ------------------------------------ |
| id              | String | ○  | 自動   | 応募ID（主キー）              | APP-20260624-A1B2C3D4                |
| createdAt       | String | ○  | 自動   | 応募日時（UTC ISO8601）      | 2026-06-24T01:00:00+00:00            |
| jobId           | String | ○  | 手動   | 応募対象求人ID               | JOB-20260624-A1B2C3D4                |
| jobTitle        | String | ○  | 手動   | 応募対象求人名                | 放射線技師                                |
| ownerUserId    | String | ○  | 自動   | 登録管理者ユーザーID | 8f3d4f7a-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| applicantUserId | String | ○  | 自動   | 応募者ユーザーID（Cognito sub） | 8f3d4f7a-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| applicantName   | String | ○  | 自動   | 応募時点の応募者氏名             | 山田太郎                                 |
| proposalAmount  | Number | ○  | 手動   | 提案金額                   | 300000                               |
| proposalContent | String | ○  | 手動   | 提案内容                   | MRI・CT業務経験10年です                      |
| status          | String | ○  | 自動   | 応募状況                   | APPLIED                              |
| reviewedBy      | String | △  | 自動   | 審査担当者ID（Cognito sub）   | 4a2c7d9e-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| reviewedAt      | String | △  | 自動   | 審査日時                   | 2026-06-25T12:00:00+00:00            |
| interviewDate   | String | △  | 手動   | 面談日時                   | 2026-07-01T10:00:00+00:00            |
| interviewMemo   | String | △  | 手動   | 面談メモ                   | 経験豊富                                 |
| rejectionReason | String | △  | 手動   | 不採用理由                  | 条件不一致                                |
| attachmentUrl   | String | △  | 手動   | 添付資料URL                | s3://...                             |

---

## GSI

### GSI1: 求人別応募一覧

| 項目      | 値                     |
| ------- | --------------------- |
| インデックス名 | jobId-createdAt-index |
| PK      | jobId                 |
| SK      | createdAt             |

用途

* 求人ごとの応募者一覧

---

### GSI2: ユーザー応募履歴

| 項目      | 値                               |
| ------- | ------------------------------- |
| インデックス名 | applicantUserId-createdAt-index |
| PK      | applicantUserId                 |
| SK      | createdAt                       |

用途

* マイページ応募履歴

---

### GSI3: 応募状況検索

| 項目      | 値                      |
| ------- | ---------------------- |
| インデックス名 | status-createdAt-index |
| PK      | status                 |
| SK      | createdAt              |

用途

* 未対応応募一覧
* 選考中一覧
* 採用一覧
* 不採用一覧

---

## ステータス定義

### 求人ステータス

| 値      | 説明   |
| ------ | ---- |
| OPEN   | 募集中  |
| CLOSED | 募集終了 |
| DRAFT  | 下書き  |

### 応募ステータス

| 値         | 説明   |
| --------- | ---- |
| APPLIED   | 応募済み |
| REVIEWING | 選考中  |
| INTERVIEW | 面談予定 |
| HIRED     | 採用   |
| REJECTED  | 不採用  |
