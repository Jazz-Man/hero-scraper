const playStatus =
  's:2245:0.00000004:0.00000002:1736451976:0:95905df4946dfcbba2b250952f434b208d6ee011db722fb81e123e91e2c1012f:PqdG1CCg8cfIVm8Z:2:fecfe0738774f828b7b224b7b7d9a30b248bb25c5d8eab20e776ebdce4e8bfc7:c8c98b4d4ce373461c186b61846636d1705dd65899837bbc23186aeefc08e84e:PqdG1CCg8cfIVm8Z:1::12:0:8:0.00000000:0.0001:0:0';

// Розбиваємо статус і дані
const [respStatus, ...respData] = playStatus?.split(':') || [];

if (respStatus === 's') {
  // Успішна відповідь
  const [
    rollResult, // t[1]: Результат ролу
    balanceBTC, // t[2]: Баланс у BTC
    winnings, // t[3]: Виграші (наприклад, у сатошах)
    lastPlayTime, // t[4]: Час останньої гри
    balanceUSD, // t[5]: Баланс у USD
    nextServerSeedHash, // t[6]: Хеш наступного серверного сіда
    clientSeed, // t[11]: Клієнтський сид
    nonce, // t[12]: Нонс
    prevServerSeed, // t[9]: Попередній серверний сид
    prevServerSeedHash, // t[10]: Хеш попереднього серверного сіда
    prevRoll, // t[1]: Попередній рол
    lotteryTickets, // t[13]: Лотерейні квитки
    rewardPoints, // t[14]: Очки нагороди
    spinsWon, // t[15]: Кількість WOF спінів
    tokensWon, // t[20]: FUN токени
    ...rest // Інші додаткові дані
  ] = respData;

  console.log('Успіх:', {
    rollResult,
    balanceBTC,
    winnings,
    lastPlayTime, // Додано пропущене значення
    balanceUSD,
    nextServerSeedHash,
    clientSeed,
    nonce,
    prevServerSeed,
    prevServerSeedHash,
    prevRoll,
    lotteryTickets,
    rewardPoints,
    spinsWon,
    tokensWon,
    additionalData: rest
  });

  // Збереження часу останньої гри у cookie
  // document.cookie = `last_play=${lastPlayTime}; Secure; Path=/; Max-Age=${3650 * 24 * 60 * 60}`;

  // Додаткові дії
  if (parseInt(rollResult) > 9997) {
    console.log('Виграв велику суму!');
  }
} else if (respStatus === 'e') {
  // Помилка
  const [errorCode, errorMessage, ...errorDetails] = respData;

  console.error('Помилка:', {
    errorCode,
    errorMessage,
    errorDetails
  });

  if (errorCode === 'e1') {
    console.log('Та ж сама IP адреса. Чекаємо таймер...');
    const timeRemaining = parseInt(errorDetails[0], 10);
    console.log(`Залишок часу: ${timeRemaining} секунд`);
    setTimeout(() => {
      console.log('Оновлюємо сторінку...');
      // RefreshPageAfterFreePlayTimerEnds(); // Виклик оновлення
    }, timeRemaining * 1000);
  }
} else {
  console.warn('Невідомий статус:', respStatus);
}
