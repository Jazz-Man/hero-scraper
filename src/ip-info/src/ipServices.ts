/**
 * @deprecated
 */
export const oneLineServices = {
	"ipaddr.site": "https://ipaddr.site",
	"checkip.amazonaws.com": "https://checkip.amazonaws.com",
	"ident.me": "https://ident.me",
	"whatismyip.akamai.com": "https://whatismyip.akamai.com",
	"ipv4.text.wtfismyip.com": "https://ipv4.text.wtfismyip.com",
	"ipify.org": "https://api.ipify.org",
	"l2.io": "https://l2.io/ip",
	// "ipaddy.net": "https://ipaddy.net",
	"curlmyip.net": "https://curlmyip.net",
	"ifconfig.io/ip": "https://ifconfig.io/ip",
	"ifconfig.es": "https://ifconfig.es",
	"ipaddress.sh": "https://ipaddress.sh",
} as const;

/**
 * @deprecated
 */
const ipServices = {
	"wtfismyip.com": "https://wtfismyip.com/json",
	"myip.wtf": "https://myip.wtf/json",
	"api.my-ip.io/v2/ip.json": "https://api.my-ip.io/v2/ip.json",
	"check.torproject.org": "https://check.torproject.org/api/ip",
	"httpbin.org": "https://httpbin.org/ip",
	"ifconfig.pro": "https://ifconfig.pro/ip.host",
	...oneLineServices,
} as const;

/**
 * @deprecated
 */
export type ServiceName = keyof typeof ipServices;

/**
 * @deprecated
 */
export type ServiceUrl = (typeof ipServices)[keyof typeof ipServices];

/**
 * Returns an array of service names in a random order.
 *
 * @deprecated
 * @returns An array of service names in a random order.
 */
export function getRandomizedServices(): ServiceName[] {
	const services = Object.keys(ipServices) as ServiceName[];
	return services.sort(() => Math.random() - 0.5); // Випадковий порядок
}

export default ipServices;
