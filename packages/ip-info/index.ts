import { fetchIPInfo, type GeoIPInfo, getPublicIP, type IPInfo } from "./old";
import {
	GeoIpNotFoundError,
	type GetIpDataType,
	IpInfoService,
	IpIsUndefinedError,
	IpServicesFailedError,
	IpServicesNotAvailableError,
} from "./src/IpInfoService";
import { PrivoxyService } from "./src/Privoxy";
import { IpInfoResponseUnion } from "./src/Schema";

export { fetchIPInfo, type GeoIPInfo, getPublicIP, type IPInfo };

export {
	type GetIpDataType,
	IpInfoService,
	IpIsUndefinedError,
	IpServicesFailedError,
	IpServicesNotAvailableError,
	GeoIpNotFoundError,
	IpInfoResponseUnion,
	PrivoxyService,
};
