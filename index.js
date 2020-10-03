const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://www.cermati.com/';
const FILE_NAME = 'result.json';

const apiInvoker = axios.create({
  baseURL: BASE_URL,
});

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
  const urls = [];

  try {
    const { data } = await apiInvoker.get('artikel');
    const { $, getHyperlink } = useCheerio(data);

    $('.article-list-item').each((_, article) => {
      urls.push(getHyperlink(article));
    });
  } catch {
    console.error('Something wrong!');
  }

  return urls;
};

const getRelatedArticles = data => {
  const { $, getHyperlink, getText } = useCheerio(data);

  const relatedArticles = $('.container .side-list-panel')
    .filter((_i, element) => {
      const panelHeader = getText(element, 'h4.panel-header');
      const isRelatedArticle = panelHeader === 'Artikel Terkait';

      return isRelatedArticle;
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

const fetchArticles = async () => {
  const urls = await getArticleUrls();

  try {
    const articles = urls.map(async url => {
      const { data } = await apiInvoker.get(url);
      const { getText } = useCheerio(data);

      const title = getText('.container', 'h1.post-title');
      const author = getText('.container', 'span.author-name');
      const postingDate = getText('.container', 'span.post-date span');

      const relatedArticles = getRelatedArticles(data);

      return {
        url,
        title,
        author,
        postingDate,
        relatedArticles,
      };
    });

    return Promise.all(articles);
  } catch {
    return console.error('Something wrong!');
  }
};

const scrape = async () => {
  try {
    const articles = await fetchArticles();
    const body = JSON.stringify({ articles });

    fs.writeFile(FILE_NAME, body, 'utf-8', () => {
      console.log('OK');
    });
  } catch {
    console.log('Something wrong!');
  }
};

scrape();
