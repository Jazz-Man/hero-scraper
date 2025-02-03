import * as OTPAuth from 'otpauth';

// Create a new TOTP object.

const getOtp = (secret: string) =>
  new OTPAuth.TOTP({
    secret: secret
  }).generate();

export default getOtp;
