const Axios = require("axios");
const _ = require("lodash");
const YEAR = 2019;
const URI = "global2000";
const API_URL = `https://www.forbes.com/ajax/list/data?year=${YEAR}&uri=${URI}&type=organization`;
const Xray = require("x-ray");
const camelCase = require("camelcase");
const scrape = Xray();
const XLSX = require("xlsx");

const LIMIT = 100

const createCompanyURI = company =>
  `https://www.forbes.com/companies/${company}/?list=${URI}`;

async function main() {
  try {
    const response = await Axios.get(API_URL);
    const { data } = response;
    const limited = _.sortBy(data, x => x.rank).slice(0, LIMIT);
    const companyData = [];

    for (const company of limited) {
      const obj = await scrape(
        createCompanyURI(company.uri),
        ".profile-content",
        {
          items: scrape(".profile-row", [
            {
              key: ".profile-row--type",
              value: ".profile-row--value"
            }
          ])
        }
      );

      const transformed = obj.items.reduce((prev, curr) => {
        return Object.assign(prev, {
          [camelCase(curr.key.replace("/", ""))]: curr.value
        });
      }, {});

      const json = { ...company, ...transformed };
      companyData.push(json);
    }

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(companyData);
    XLSX.utils.book_append_sheet(workbook, sheet);
    XLSX.writeFile(workbook, "data.xlsx");
  } catch (error) {
    return console.error("Error\n", error.message);
  }
}

main();
