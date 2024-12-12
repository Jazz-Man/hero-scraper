const ipServices = {
  "wtfismyip.com": "https://wtfismyip.com/json",
  "myip.wtf": "https://myip.wtf/json",
  "icanhazip.com": "https://icanhazip.com",
  "checkip.amazonaws.com": "https://checkip.amazonaws.com",
  "ipify.org": "https://api.ipify.org",
  "ident.me": "https://ident.me",
  // "ifconfig.me": "https://ifconfig.me/ip",
  "api.my-ip.io/v2/ip.json": "https://api.my-ip.io/v2/ip.json",
  "whatismyip.akamai.com": "https://whatismyip.akamai.com",
  "check.torproject.org": "https://check.torproject.org/api/ip",
  // "ipify.org (IPv6)": "https://api64.ipify.org",
  "ipv4.text.wtfismyip.com": "https://ipv4.text.wtfismyip.com",
} as const;


export type ServiceName = keyof typeof ipServices;

export type ServiceUrl = typeof ipServices[keyof typeof ipServices];

export const getRandomService = (): ServiceName => {
  const services = Object.keys(ipServices) as ServiceName[];
  return services[Math.floor(Math.random() * services.length)];
};

export function getRandomizedServices(): ServiceName[] {
  const services = Object.keys(ipServices) as ServiceName[];
  return services.sort(() => Math.random() - 0.5); // Випадковий порядок
}

export default ipServices;
