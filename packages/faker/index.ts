import { Faker as FakerBase, base, en, en_US } from "@faker-js/faker";

const faker = new FakerBase({ locale: [en_US, en, base] });

export default faker;
