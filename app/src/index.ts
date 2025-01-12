import App from './App.ts';
import getOtp from './otp.ts';

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
  username: 'info@gmail',
  password: 'finhap-xAfpux-5kifko',
  tfa_secret: 'HXAZUGRYZXCG2K6N'
};

(async () => {
  try {
    const app = new App(testUser.username, testUser.password, true);

    await app.init({
      showChrome: true,
      showDevtools: true
    });

    await app.goto('https://freebitco.in/?op=home');

    await app.initCookie();

    try {
      const tfa_code = getOtp(testUser.tfa_secret);

      await app.login(tfa_code);
    } catch (e) {
      console.error(e);
    }

    await app.freePlay();

    await app.reload();

    await app.saveProfileCookies();

    const meta = await app.hero.meta;

    return meta;
  } catch (e) {
    throw e;
  }
})()
  .then((res) => console.log(res))
  .catch((e) => console.error(e));
