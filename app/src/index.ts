import type { TUser } from './@types';
import App from './App.ts';
import getOtp from './otp.ts';
import {
  generateTestEmail,
  generateTestPassword
} from './utils/random-data.ts';

const userRoot: TUser = {
  username: 'info@vsokolyk.pp.ua',
  password: 'finhap-xAfpux-5kifko',
  tfa_secret: 'HXAZUGRYZXCG2K6N'
};

const testUser: TUser = {
  username: 'rider_64paleo@icloud.com',
  password: 'jawheT-wiwsuc-7padpa',
  tfa_secret: 'SWDCEBDMWSWGGVMS'
};

const generateUser: TUser = {
  username: generateTestEmail(),
  password: generateTestPassword(),
  tfa_secret: 'HXAZUGRYZXCG2K6N'
};

const app = new App(userRoot.username, userRoot.password);

await app.init({
  showChrome: true,
  showDevtools: true
});

await app.goto('https://freebitco.in/?op=home');

await app.initCookie();

const tfa_code = getOtp(userRoot.tfa_secret);

await app.login(tfa_code);
//
// try {
//   await app.freePlay();
// } catch (e) {
//   console.error(e);
// }

// await app.signup('321654989');
await app.freePlay();

const meta = await app.hero.meta;

// await app.hero.close();

console.log(meta);
