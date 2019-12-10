const settings = {
    LIMIT: 2000,
    YEAR: 2019,
    URI: "global2000"
}

const Axios = require("axios");
const _ = require("lodash");
const API_URL = `https://www.forbes.com/ajax/list/data?year=${settings.YEAR}&uri=${settings.URI}&type=organization`;
const scrape = require("x-ray")();
const camelCase = require("camelcase");
const XLSX = require("xlsx");
const cliProgress = require("cli-progress");

const createCompanyURI = company =>
  `https://www.forbes.com/companies/${company}/?list=${settings.URI}`;

async function main() {
  try {
    const response = await Axios.get(API_URL);
    const { data } = response;
    const limited = _.sortBy(data, x => x.rank).slice(0, settings.LIMIT);
    const companyData = [];
    const progress = new cliProgress.SingleBar({}, cliProgress.Presets.rect);
    progress.start(limited.length, 0);
    for (const [index, company] of limited.entries()) {
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
      progress.update(index);
    }
    progress.update(limited.length);

    progress.stop();

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(companyData);
    XLSX.utils.book_append_sheet(workbook, sheet);
    XLSX.writeFile(workbook, "data.xlsx");
  } catch (error) {
    return console.error("Error\n", error.message);
  }
}

main();
