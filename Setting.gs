const PROPS = PropertiesService.getScriptProperties();
const OPENAI_APIKEY = PROPS.getProperty('OPENAI_APIKEY');
const LINE_ACCESS_TOKEN = PROPS.getProperty('LINE_ACCESS_TOKEN');

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_LOG = SS.getSheetByName('ログ');
const SHEET_USER = SS.getSheetByName('ユーザー');
const SHEET_DEBUG = SS.getSheetByName('デバッグ');
const MAX_COUNT_LOG = 3;

const PROMPT_GENERATORS = {
  ポップアップストア: getPopupSpacePrompt,
  リブランディング: getRebrandingSpacePrompt,
  // 追加のカテゴリがあればここに追加
};

const CATEGORY_KEYWORDS = {
  ポップアップストアについて: 'ポップアップストア',
  リブランディングについて: 'リブランディング',
  // 追加のカテゴリがあればここに追加
};
