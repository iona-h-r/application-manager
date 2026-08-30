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