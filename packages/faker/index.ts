import { base, en, en_US, Faker as FakerBase } from "@faker-js/faker";

const faker = new FakerBase({ locale: [en_US, en, base] });

export default faker;
