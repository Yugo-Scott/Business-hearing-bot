/**
 * OpenAIへのペイロードを作成する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} postMessage - ユーザーメッセージ
 * @param {Function} promptGenerator - プロンプト生成関数
 * @param {string} currentCategory - 現在のカテゴリ
 * @return {Object} - OpenAIへのペイロード
 */
function createPayloadForOpenAI(
  userId,
  postMessage,
  promptGenerator,
  currentCategory
) {
  let history = getLastUserMessages(userId, MAX_COUNT_LOG, currentCategory);

  // 最新メッセージが履歴に含まれているかをチェック
  let isMessageAlreadyInHistory = history.some(
    (message) => message.content === postMessage && message.role === 'user'
  );

  // 最新メッセージが含まれていない場合にのみ追加
  if (!isMessageAlreadyInHistory) {
    history.unshift({ role: 'user', content: postMessage });
  }

  let payload = {
    model: 'gpt-4-turbo',
    messages: [{ role: 'system', content: promptGenerator() }, ...history],
  };

  return payload;
}

/**
 * OpenAIからの応答を取得する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} postMessage - ユーザーメッセージ
 * @param {string} category - カテゴリ
 * @return {string} - OpenAIからの応答
 */
function fetchOpenAIResponse(userId, postMessage, category) {
  // writeLog('fetchOpenAIResponse: entered function', { userId, postMessage, category });

  const history = getLastUserMessages(userId, MAX_COUNT_LOG, category); // 定数を使用して履歴件数を指定
  let payload;

  // writeLog('fetchOpenAIResponse: history', JSON.stringify(history));
  // writeLog('fetchOpenAIResponse: category', category);
  // writeLog('fetchOpenAIResponse: PROMPT_GENERATORS keys', JSON.stringify(Object.keys(PROMPT_GENERATORS)));

  const promptGenerator = PROMPT_GENERATORS[category] || getDefaultPrompt;
  // writeLog('fetchOpenAIResponse: promptGenerator defined', promptGenerator !== undefined);

  if (promptGenerator !== undefined) {
    // writeLog('fetchOpenAIResponse: promptGenerator', promptGenerator.name);
  } else {
    // writeLog('fetchOpenAIResponse: promptGenerator', 'undefined');
  }

  if (history.length > 0) {
    payload = createPayloadForOpenAI(
      userId,
      postMessage,
      promptGenerator,
      category
    );
  } else {
    payload = {
      model: 'gpt-4-turbo',
      messages: [{ role: 'system', content: promptGenerator() }],
    };
  }

  // デバッグ用にペイロードをログに出力
  // writeLog('fetchOpenAIResponse: payload', JSON.stringify(payload));
  // リクエストオプションを設定
  const requestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + OPENAI_APIKEY,
    },
    payload: JSON.stringify(payload),
  };

  try {
    // OpenAIのAPIエンドポイントにリクエストを送信
    const response = UrlFetchApp.fetch(
      'https://api.openai.com/v1/chat/completions',
      requestOptions
    );
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);
    // OpenAIからの応答からテキストを抽出
    return json.choices[0].message.content.trim();
  } catch (error) {
    // エラー発生時のハンドリングを強化
    console.error('Error fetching OpenAI response: ', error.toString());
    return '現在、応答を取得できません。後ほど再試行してください。';
  }
}
