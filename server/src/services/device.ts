/**
 * User-Agent文字列から人間にとって分かりやすい端末・ブラウザ表記を生成
 */
export function parseUserAgent(ua: string | undefined): string {
  if (!ua) return '不明な端末';

  let os = '不明なOS';
  let browser = '';

  // OS判定
  if (/iPhone/i.test(ua)) {
    os = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPad';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'Mac';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows PC';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // ブラウザ判定
  if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  }

  if (browser) {
    return `${os} (${browser})`;
  }
  return os;
}
