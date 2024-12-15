export const getRandomUsername = () => `x${Math.floor(Math.random() * 100000)}x`;

export const getProxyUrl = (username: string = getRandomUsername()) =>
  `http://${username}:pass@127.0.0.1:8118`;
  // `http://${username}:pass@127.0.0.1:9080`;
