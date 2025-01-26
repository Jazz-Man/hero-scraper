import crypto from 'crypto';

type TCharsetType = 'uppercase' | 'lowercase' | 'digits' | 'special';

type TCharset = Record<TCharsetType, string>;

// Генерація набору символів
function generateCharset(): TCharset {
  const charset: TCharset = {
    uppercase: '',
    lowercase: '',
    digits: '',
    special: ''
  };

  for (let i = 65; i <= 90; i++) charset.uppercase += String.fromCharCode(i); // A-Z
  for (let i = 97; i <= 122; i++) charset.lowercase += String.fromCharCode(i); // a-z
  for (let i = 48; i <= 57; i++) charset.digits += String.fromCharCode(i); // 0-9

  // Спеціальні символи (ASCII: 33-47, 58-64, 91-96, 123-126)
  const specialRanges = [
    [33, 47],
    [58, 64],
    [91, 96],
    [123, 126]
  ];
  for (const [start, end] of specialRanges) {
    for (let i = start; i <= end; i++) {
      charset.special += String.fromCharCode(i);
    }
  }

  return charset;
}

export function generatePassword(length: number = 32): string {
  const useCharset = generateCharset();

  const charset: string = Object.values(useCharset).join('');
  if (!charset) {
    throw new Error(
      'Charset cannot be empty. Please provide valid character sets.'
    );
  }

  // Обов'язково додаємо по одному символу з кожної категорії
  let password = (Object.keys(useCharset) as TCharsetType[])
    .map((category) => {
      const charSet = useCharset[category];
      const randomIndex = crypto.randomInt(0, charSet.length);
      return charSet[randomIndex];
    })
    .join('');

  // Генеруємо залишкові символи
  for (let i = password.length; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  // Перемішуємо символи
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
  return password;
}
