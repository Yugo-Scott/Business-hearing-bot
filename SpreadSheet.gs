/**
 * 指定した列の次の空行の行番号を返す関数
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 対象のシート
 * @param {number} columnIndex - 列のインデックス
 * @return {number} - 次の空行の行番号
 */
function findNextEmptyOrNewRow(sheet, columnIndex) {
  // writeLog(`findNextEmptyOrNewRow: sheet name is ${sheet.getName()}, columnIndex = ${columnIndex}`);
  const columnRange = sheet.getRange(1, columnIndex, sheet.getLastRow(), 1);
  writeLog(
    `findNextEmptyOrNewRow: columnRange = ${columnRange.getA1Notation()}`
  );
  const values = columnRange.getValues();

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === '' || values[i][0] === null) {
      return i + 1; // 1ベースの行番号を返す
    }
  }
  return sheet.getLastRow() + 1; // 空行がない場合、最後の行の次の行番号を返す
}

/**
 * ユーザーIDとユーザーメッセージをユーザーごとのスプレッドシートに保存する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} userMessage - ユーザーメッセージ
 */
function saveUserDataToSpreadsheet(userId, userMessage) {
  const sheet = getUserSheet(userId); // ユーザーのスプレッドシートを取得
  const newRowUserId = findNextEmptyOrNewRowNew(sheet, 1);
  const newRowMessage = findNextEmptyOrNewRowNew(sheet, 4);

  setValueToSheetNew(sheet, newRowUserId, 1, userId);
  setValueToSheetNew(sheet, newRowMessage, 4, userMessage);
}

/**
 * 指定した行と列に値を設定する関数
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 対象のシート
 * @param {number} row - 行番号
 * @param {number} column - 列番号
 * @param {any} value - 設定する値
 */
function setValueToSheet(sheet, row, column, value) {
  sheet.getRange(row, column).setValue(value);
}

/**
 * 指定されたユーザーの過去のメッセージを取得する関数
 *
 * @param {string} userId - ユーザーID
 * @param {number} maxCount - 最大取得件数
 * @param {string} currentCategory - カテゴリー
 * @return {Array<{role: string, content: string}>} - 過去のメッセージの配列
 */
function getLastUserMessages(userId, maxCount, currentCategory) {
  const sheet = getUserSheet(userId); // ユーザーのスプレッドシートを取得
  const firstDataRow = 2;
  const numRows = sheet.getLastRow() - firstDataRow + 1;
  const dataRange = sheet.getRange(
    firstDataRow,
    1,
    numRows,
    sheet.getMaxColumns()
  );
  const values = dataRange.getValues();
  const history = [];

  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === userId && values[i][1] === currentCategory) {
      // Assuming category is stored in the second column
      history.push({ role: 'user', content: values[i][3] });
      history.push({ role: 'assistant', content: values[i][2] });
      if (history.length / 2 >= maxCount) break;
    }
  }
  return history.reverse();
}

/**
 * ユーザーごとのスプレッドシートにカテゴリを更新または設定
 *
 * @param {string} userId - ユーザーID
 * @param {string} message - ユーザーのメッセージ
 * @return {string} - 新しいカテゴリ
 */
function updateOrSetCategory(userId, message) {
  const sheet = getUserSheet(userId);
  let newCategory = getLastNonEmptyCategory(sheet);

  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (message.includes(keyword)) {
      newCategory = category;
      break;
    }
  }

  const newRowCategory = findNextEmptyOrNewRow(sheet, 2);
  setValueToSheet(sheet, newRowCategory, 2, newCategory);
  return newCategory;
}

/**
 * ユーザーごとのスプレッドシートから特定のカテゴリの最後の行を取得する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} category - カテゴリ
 * @return {number} - 特定のカテゴリの最後の行
 */
function findLastRowByCategory(userId, category) {
  const sheet = getUserSheet(userId); // ユーザーのスプレッドシートを取得
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][1] === category) {
      // カテゴリが2列目にあると仮定
      return i + 1;
    }
  }
  return -1;
}

/**
 * ユーザーごとのスプレッドシートの特定の行内の空のセルを埋める関数
 *
 * @param {string} userId - ユーザーID
 * @param {number} row - 行番号
 */
function fillEmptyCellsInRow(userId, row) {
  const sheet = getUserSheet(userId); // ユーザーのスプレッドシートを取得
  const defaultVal = '-';
  const columnsToCheck = [1, 3, 4]; // チェックする列のインデックス
  columnsToCheck.forEach((col) => {
    const cell = sheet.getRange(row, col);
    const cellValue = cell.getValue();
    if (!cellValue || cellValue.toString().trim() === '') {
      if (col === 1) {
        cell.setValue(userId);
      } else {
        cell.setValue(defaultVal);
      }
    }
  });
}

/**
 * ユーザーごとのスプレッドシートから現在のカテゴリを取得
 *
 * @param {string} userId - ユーザーID
 * @return {string} - 現在のカテゴリ
 */
function getUserCurrentCategory(userId) {
  const sheet = getUserSheet(userId);
  writeLog(`getUserCurrentCategory: sheet name = ${sheet.getName()}`);
  const data = sheet.getDataRange().getValues();
  writeLog(`getUserCurrentCategory: data = ${JSON.stringify(data)}`);

  for (let i = data.length - 1; i > 0; i--) {
    // i > 0 とすることで1行目を除外
    if (data[i][0] === userId) {
      return data[i][1]; // Assuming the category is stored in the second column
    }
  }
  return null;
}

/**
 * 指定した列の最後の非空のカテゴリを取得する関数
 *
 * @param {Sheet} sheet - スプレッドシートのシートオブジェクト
 * @return {string} - 最後の非空のカテゴリ
 */
function getLastNonEmptyCategory(sheet) {
  const columnRange = sheet.getRange(1, 2, sheet.getLastRow());
  writeLog('columnRange = ' + columnRange.getA1Notation());
  const values = columnRange.getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '') {
      return values[i][0];
    }
  }
  return '';
}

/**
 * デバッグ用ログ書き込み関数
 *
 * @param {string} message - ログメッセージ
 * @param {any} content - ログ内容
 */
function writeLog(message, content) {
  try {
    const nextRow = findNextEmptyOrNewRowInSheet(SHEET_DEBUG, 1); // SHEET_DEBUGの次の空行を取得
    const timestamp = new Date();

    SHEET_DEBUG.getRange(nextRow, 1).setValue(timestamp); // タイムスタンプを記録
    SHEET_DEBUG.getRange(nextRow, 2).setValue(message); // メッセージを記録
    SHEET_DEBUG.getRange(nextRow, 3).setValue(content); // 内容を記録
  } catch (error) {
    Logger.log('Error in writeLog: ' + error.toString());
  }
}

/**
 * 指定したシートの指定した列の次の空行の行番号を返す関数
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 対象のシート
 * @param {number} columnIndex - 列のインデックス
 * @return {number} - 次の空行の行番号
 */
function findNextEmptyOrNewRowInSheet(sheet, columnIndex) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      return 1;
    }
    const columnRange = sheet.getRange(1, columnIndex, lastRow, 1);
    const values = columnRange.getValues();

    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === '' || values[i][0] === null) {
        return i + 1; // 1ベースの行番号を返す
      }
    }
    return lastRow + 1; // 空行がない場合、最後の行の次の行番号を返す
  } catch (error) {
    Logger.log('Error in findNextEmptyOrNewRowInSheet: ' + error.toString());
    writeLog('findNextEmptyOrNewRowInSheet: error', error.toString());
    throw error;
  }
}

/**
 * ユーザーIDに対応するスプレッドシートIDを取得
 *
 * @param {string} userId - ユーザーID
 * @return {string} - スプレッドシートID
 */
function getSheetIdByUserId(userId) {
  const data = SHEET_USER.getDataRange().getValues();
  writeLog(`getSheetIdByUserId: data = ${JSON.stringify(data)}`);
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 1列目がuserId
      return data[i][4]; // 5列目がSHEET_ID
    }
  }
  throw new Error(`Sheet ID for user ${userId} not found`);
}

/**
 * ユーザーのスプレッドシートを取得
 *
 * @param {string} userId - ユーザーID
 * @return {Sheet} - ユーザーのスプレッドシート
 */
function getUserSheet(userId) {
  const sheetId = getSheetIdByUserId(userId); // 動的に取得したスプレッドシートID
  writeLog(`getUserSheet: sheetId = ${sheetId}`);
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  writeLog(`getUserSheet: spreadsheet URL = ${spreadsheet.getUrl()}`);
  if (!spreadsheet) {
    writeLog(`Sheet ID: ${sheetId}`);
    throw new Error(`Spreadsheet for user ${userId} not found`);
  }
  const sheet = spreadsheet.getSheets()[0];
  writeLog(`getUserSheet: sheet name for user ${userId} is ${sheet.getName()}`);
  return sheet;
}

/**
 * ユーザーごとのスプレッドシートに返信メッセージを保存する関数
 *
 * @param {string} userId - ユーザーID
 * @param {string} replyMessage - 返信メッセージ
 */
function saveReplyMessageToSpreadsheet(userId, replyMessage) {
  const sheet = getUserSheet(userId); // ユーザーのスプレッドシートを取得
  const newRow = findNextEmptyOrNewRowNew(sheet, 3);
  setValueToSheetNew(sheet, newRow, 3, replyMessage);
}
