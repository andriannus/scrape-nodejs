const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://www.cermati.com/';
const FILE_NAME = 'result';

const apiInvoker = axios.create({
  baseURL: BASE_URL,
});

const createJsonFile = data => {
  const json = JSON.stringify(data, null, 2);

  fs.writeFile(`${FILE_NAME}.json`, json, 'utf-8', err => {
    if (err) throw Error(err);
    console.log('OK');
  });
};

const useCheerio = html => {
  const $ = cheerio.load(html);

  const getText = (parent, children) => {
    return $(parent).find(children).text().trim();
  };

  const getHyperlink = selector => {
    return $(selector).find('a').attr('href');
  };

  return { $, getHyperlink, getText };
};

const getArticleUrls = async () => {
  try {
    const { data } = await apiInvoker.get('artikel');
    const { $, getHyperlink } = useCheerio(data);

    const urls = $('.article-list-item')
      .map((_, article) => {
        return getHyperlink(article);
      })
      .get();

    return urls;
  } catch {
    throw Error('Something wrong!');
  }
};

const getRelatedArticles = data => {
  const { $, getHyperlink, getText } = useCheerio(data);

  const relatedArticles = $('.container .side-list-panel')
    .filter((_i, element) => {
      const panelHeader = getText(element, 'h4.panel-header');
      return panelHeader === 'Artikel Terkait';
    })
    .map((_j, element) => $(element).find('ul.panel-items-list li').get())
    .map((_k, list) => {
      return {
        url: getHyperlink(list),
        title: getText(list, 'h5.item-title'),
      };
    })
    .get();

  return relatedArticles;
};

const fetchArticles = async urls => {
  try {
    const articles = urls.map(async url => {
      const { data } = await apiInvoker.get(url);
      const { getText } = useCheerio(data);

      return {
        url,
        title: getText('.container', 'h1.post-title'),
        author: getText('.container', 'span.author-name'),
        postingDate: getText('.container', 'span.post-date span'),
        relatedArticles: getRelatedArticles(data),
      };
    });

    return Promise.all(articles);
  } catch {
    throw Error('Something wrong!');
  }
};

const scrape = async () => {
  try {
    const urls = await getArticleUrls();
    const articles = await fetchArticles(urls);

    createJsonFile({ articles });
  } catch (err) {
    console.error(err);
  }
};

scrape(); // Call main function
