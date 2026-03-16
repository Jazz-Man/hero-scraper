import { fetchIPInfo, type GeoIPInfo, getPublicIP, type IPInfo } from "./old";
import {
	GeoIpNotFoundError,
	IpInfoService,
	IpIsUndefinedError,
	IpServicesFailedError,
	IpServicesNotAvailableError,
} from "./src/IpInfoService";
import { IpInfoResponseUnion } from "./src/Schema";

export {
	fetchIPInfo,
	type GeoIPInfo,
	GeoIpNotFoundError,
	getPublicIP,
	type IPInfo,
	IpInfoResponseUnion,
	IpInfoService,
	IpIsUndefinedError,
	IpServicesFailedError,
	IpServicesNotAvailableError,
};
