import App from './App.ts';
import getOtp from './otp.ts';
import {
  generateTestEmail,
  generateTestPassword
} from './utils/random-data.ts';

type TUser = {
  username: string;
  password: string;
  tfa_secret: string;
};

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

const app = new App(generateUser.username, generateUser.password, true);

await app.init({
  showChrome: true,
  showDevtools: true
});

await app.goto('https://freebitco.in/?op=home');

await app.initCookie();

const tfa_code = getOtp(generateUser.tfa_secret);

// await app.login(tfa_code);
//
// try {
//   await app.freePlay();
// } catch (e) {
//   console.error(e);
// }

// await app.signup();
// await app.freePlay();

await app.saveProfileCookies();

const meta = await app.hero.meta;

await app.hero.close();

console.log(meta);
