function doPost(e) {
  // イベントデータ全体をログに出力
  // writeLog('doPost: Event received', JSON.stringify(e));

  // JSONパース前にログを追加
  // writeLog('doPost: Before parsing event data');

  let eventData = JSON.parse(e.postData.contents).events[0];
  // writeLog('doPost: Parsed event data', JSON.stringify(eventData));

  let eventType = eventData.type;
  // writeLog('doPost: Event type', eventType);

  // unfollowイベントの場合は特別な処理を行わずに終了
  if (eventType === 'unfollow') {
      // writeLog('doPost: unfollow event, no action taken');
      return;
  }

  const userId = eventData.source.userId; // LINEのユーザーID
  const dataType = eventData.type; // データのタイプ
  // writeLog(`doPost: userId = ${userId}, dataType = ${dataType}`);

  // followイベントの場合、特別な処理を行う
  if (dataType === "follow") {
      // フォロー時に新しく個別のシートを作成
      const sheetId = findSheetId(userId);
      // writeLog(`doPost: sheetId = ${sheetId}`);

      if (typeof sheetId === "undefined") {
          // writeLog('doPost: Adding a new user');
          try {
              addAUser(userId);
          } catch (error) {
              // writeLog('doPost: addAUser error', error.toString());
          }
      } else {
          // writeLog('doPost: User already followed, exiting');
      }
      return;
  }

  let replyToken = eventData.replyToken;
  let messageType = eventData.message ? eventData.message.type : null;
  let userMessage = eventData.message ? eventData.message.text : null;

  // 関数が呼ばれたことをログに出力
  // writeLog('doPost: Function called');

  // メッセージタイプが存在しない場合の処理
  if (!messageType) {
      // writeLog('doPost: No message type found');
      return;
  }

  if (messageType !== 'text') {
      // writeLog('doPost: Non-text message type', messageType);
      return sendMessage(replyToken, "まだ文章しか認識できません。申し訳ございません。");
  }

    // 現在のカテゴリを取得
    const previousCategory = getUserCurrentCategory(userId);
    // writeLog('doPost: previousCategory', previousCategory);

    // カテゴリを更新または設定
    const newCategory = updateOrSetCategory(userId, userMessage);
    // writeLog('doPost: newCategory', newCategory);

//     // カテゴリが変わった場合にのみ空のセルを埋める
    if (newCategory !== previousCategory && previousCategory !== null) {
        const previousRowCategory = findLastRowByCategory(userId, previousCategory); // Get the row of the previous category
        // writeLog('performing fillEmptyCellsInRow', previousRowCategory);
        fillEmptyCellsInRow(userId, previousRowCategory);
        // writeLog("done performing fillEmptyCellsInRow")
    }

  const isKeywordIncluded = Object.keys(CATEGORY_KEYWORDS).some(keyword => userMessage.includes(keyword));
  // writeLog('doPost: isKeywordIncluded', isKeywordIncluded);

  if (!isKeywordIncluded) {
      try {
          saveUserDataToSpreadsheet(userId, userMessage);
      } catch (error) {
          Logger.log('スプレッドシートへの保存中にエラーが発生しました: ' + error.toString());
      }
  }

 let replyMessage = fetchOpenAIResponse(userId, userMessage,newCategory);
  // writeLog('doPost: replyMessage', replyMessage);

  try {
    Logger.log(replyMessage);
    saveReplyMessageToSpreadsheet(userId, replyMessage);
  } catch (error) {
    Logger.log('スプレッドシートへの保存中にエラーが発生しました: ' + error.toString());
    // 必要に応じてエラーメッセージをLINEに返信する処理を追加
  }  

    let payload = {
      'replyToken': replyToken,
      'messages': [{ 'type': 'text', 'text': replyMessage }]
    };

  let options = {
    'method': 'POST',
    'payload': JSON.stringify(payload),
    'headers': { "Authorization": "Bearer " + LINE_ACCESS_TOKEN },
    'contentType': 'application/json'
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', options);
}