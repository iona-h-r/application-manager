/**
 * 指定ページを取得するために必要なページトークンを解決する関数。
 *
 * 引数:
 * - tokens: 各ページの開始トークンを持つオブジェクト
 *   例: { 1: null, 2: "xxx", 3: "yyy" }
 * - targetPage: 移動したいページ番号（number）
 * - fetchPage: トークンを使ってページ情報を取得する関数（function）
 * - maxAdvance: キャッシュ済みページから一度に探索できる最大ページ数（number）
 *
 * 処理:
 * - すでに対象ページのトークンがあればそのまま返す
 * - 未取得のページなら fetchPage を順番に呼び、必要なトークンを補完する
 * - maxAdvance を超えるページジャンプはエラーにする
 *
 * 戻り値:
 * - token: 対象ページを取得するためのトークン（string または null）
 * - tokens: 探索後のページトークン一覧（object）
 */
export async function resolvePageToken({
  tokens,
  targetPage,
  fetchPage,
  maxAdvance = 5,
}) {
  const maxJumpablePage = Math.max(
    ...Object.keys(tokens).map(Number)
  )

  if (targetPage > maxJumpablePage + maxAdvance) {
throw new Error(
  `一度にジャンプできるのは${maxJumpablePage + maxAdvance}ページまでです。`
)
  }

  if (Object.prototype.hasOwnProperty.call(tokens, targetPage)) {
    return {
      token: tokens[targetPage],
      tokens,
    }
  }

  const nextTokens = { ...tokens }
  let probePage = maxJumpablePage

  while (probePage < targetPage) {
    const startToken = nextTokens[probePage]
    const result = await fetchPage(startToken)

    if (!result.nextToken) {
      throw new Error(`指定ページ${targetPage}は存在しません`)
    }

    nextTokens[probePage + 1] = result.nextToken
    probePage += 1
  }

  return {
    token: nextTokens[targetPage],
    tokens: nextTokens,
  }
}