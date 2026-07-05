# 開発開始ガイド

## 1. タスク管理

実装するタスクは以下からご確認お願いします

- https://github.com/mkylzpu1/application-manager/issues

---

## 2. 開発フロー

### Fork

本リポジトリを **Fork** して、自分のリポジトリで作業してください。

```
Original Repository（齊藤のリポジトリ）
        │
        ▼
   Fork Repository（ご自身のリポジトリ）
        │
        ▼
   feature/xxxx ブランチ
```

---

### ブランチ構成

```
prd  (本番環境)
└── dev  (開発ブランチ)
    ├── feature/login
    ├── feature/user-list
    └── feature/xxxx
```

- `prd`
  - 本番環境用ブランチ
  - 直接コミットしない

- `dev`
  - 開発ブランチ
  - feature ブランチは必ず `dev` から作成する

- `feature/*`
  - 実装用ブランチ
  - issueごとに作成する

---

### ブランチ作成

必ず `dev` を最新にしてから作成してください。

```bash
git checkout dev
git pull upstream dev

git checkout -b feature/○○
```

---

### Pull Request

作業完了後は

```
feature/xxxx
      │
      ▼
Fork Repository の dev
      │
      ▼
Original Repository の dev
```

へ Pull Request を作成してください。

※ `prd` には Pull Request を作成しないでください。

---

## 3. 管理者権限の付与

 Application-managerの管理画面を利用するには、管理者権限を付与してください。

### 手順

1. AWS Console を開く
2. Cognito User Pool を開く
3. Users から自分のユーザーを選択
4. **admin** グループへ追加

これで管理者権限が付与されます。

