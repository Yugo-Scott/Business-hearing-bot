/**
 * ユーザーのプロフィール名を取得する関数
 *
 * @param {string} userId - ユーザーID
 * @return {string} - プロフィール名
 */
function getUserDisplayName(userId) {
  const url = 'https://api.line.me/v2/bot/profile/' + userId;
  const userProfile = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
    },
  });
  return JSON.parse(userProfile).displayName;
}

/**
 * ユーザーのプロフィール画像を取得する関数
 *
 * @param {string} userId - ユーザーID
 * @return {string} - プロフィール画像のURL
 */
function getUserDisplayIMG(userId) {
  const url = 'https://api.line.me/v2/bot/profile/' + userId;
  const userProfile = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
    },
  });
  return JSON.parse(userProfile).pictureUrl;
}

/**
 * 新しいユーザーを追加する関数
 *
 * @param {string} userId - ユーザーID
 */
function addAUser(userId) {
  const userName = getUserDisplayName(userId);
  const userIMG = getUserDisplayIMG(userId);
  const newRow = findNextEmptyOrNewRowInSheet(SHEET_USER, 1);
  const date = Utilities.formatDate(
    new Date(),
    'Asia/Tokyo',
    'yyyy-MM-dd HH:mm:ss'
  );
  setValueToSheet(SHEET_USER, newRow, 1, userId);
  setValueToSheet(SHEET_USER, newRow, 2, userName);
  setValueToSheet(SHEET_USER, newRow, 3, userIMG);
  setValueToSheet(SHEET_USER, newRow, 4, 0);
  setValueToSheet(SHEET_USER, newRow, 6, date);
  setValueToSheet(SHEET_USER, newRow, 7, date);

  // 新しいスプレッドシートを作成
  const userSheet = createUserSheet(userId, userName);
  setValueToSheet(SHEET_USER, newRow, 5, userSheet.getId());
  // writeLog(`New user sheet created for userId: ${userId}, sheetId: ${userSheet.getId()}`);
}

/**
 * ユーザーが存在するかどうかを確認する関数
 *
 * @param {string} userId - ユーザーID
 * @return {boolean} - ユーザーが存在するかどうか
 */
function findUser(userId) {
  var users = SHEET_USER.getDataRange().getValues(); // シートから全ユーザーデータを取得
  for (var i = 0; i < users.length; i++) {
    if (users[i][0] === userId) {
      // 最初の列がユーザーIDを格納していると仮定
      return true; // ユーザーIDが見つかった
    }
  }
  return false; // ユーザーIDが見つからなかった
}

/**
 * ユーザーのデータを取得する関数
 *
 * @return {Array<{userId: string, name: string, profilePic: string, postCount: number, sheetId: string, createdAt: string, updatedAt: string}>} - ユーザーデータの配列
 */
function getUserData() {
  const data = SHEET_USER.getDataRange().getValues();
  return data.map(function (row) {
    return {
      userId: row[0],
      name: row[1],
      profilePic: row[2],
      postCount: row[3],
      sheetId: row[4],
      createdAt: row[5],
      updatedAt: row[6],
    };
  });
}

/**
 * シートIDを保存する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} name - ユーザー名
 * @param {string} profilePic - プロフィール画像URL
 * @param {number} postCount - 投稿数
 * @param {string} sheetId - シートID
 */
function saveSheetId(userId, name, profilePic, postCount, sheetId) {
  const newRow = findNextEmptyOrNewRow(1);
  const now = new Date().toISOString();
  setValueToSheet(newRow, 1, userId);
  setValueToSheet(newRow, 2, name);
  setValueToSheet(newRow, 3, profilePic);
  setValueToSheet(newRow, 4, postCount);
  setValueToSheet(newRow, 5, sheetId);
  setValueToSheet(newRow, 6, now); // 登録日時
  setValueToSheet(newRow, 7, now); // 更新日時
}

/**
 * 新しいユーザーのシートを作成する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} userName - ユーザー名
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} - 新しく作成されたスプレッドシート
 */
function createUserSheet(userId, userName) {
  // 既存のスプレッドシートのコピーを作成
  const ssCopy = SS.copy(`[ログ_${userName}]`);
  const sheetIdCopy = ssCopy.getId();

  // コピーしたスプレッドシートの不要なシートを削除
  const sheetLogCopy = ssCopy.getSheetByName('ログ');
  const sheetUserCopy = ssCopy.getSheetByName('ユーザー');
  const sheetDebugCopy = ssCopy.getSheetByName('デバッグ');

  if (sheetUserCopy) ssCopy.deleteSheet(sheetUserCopy);
  if (sheetDebugCopy) ssCopy.deleteSheet(sheetDebugCopy);

  // シートのログデータは全て削除
  const numColumn = sheetLogCopy.getLastColumn();
  const numRow = sheetLogCopy.getLastRow();
  if (numRow > 1) {
    sheetLogCopy.getRange(2, 1, numRow - 1, numColumn).clear();
  }
  // writeLog(`Sheet copied for userId: ${userId}, sheetId: ${sheetIdCopy}`);
  return ssCopy;
}

/**
 * ユーザーのスプレッドシートを検索する関数
 *
 * @param {string} uid - ユーザーID
 * @return {string|undefined} - シートIDまたはundefined
 */
function findSheetId(uid) {
  return (
    getSheetId().reduce(function (uuid, row) {
      return uuid || (row.key === uid && row.value);
    }, false) || undefined
  );
}

/**
 * ユーザーのスプレッドシート情報を取得する関数
 *
 * @return {Array<{key: string, value: string}>} - シートID情報の配列
 */
function getSheetId() {
  const data = SHEET_USER.getDataRange().getValues();
  return data.map(function (row) {
    return { key: row[0], value: row[4] };
  });
}
