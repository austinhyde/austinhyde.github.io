import Metalsmith from 'metalsmith';
import markdown from 'metalsmith-markdown';
import templates from 'metalsmith-templates';
import collections from 'metalsmith-collections';
import permalinks from 'metalsmith-permalinks';
import less from 'metalsmith-less';
import tags from 'metalsmith-tags';
import excerpts from 'metalsmith-excerpts';
import pagination from 'metalsmith-pagination';
import debug from 'metalsmith-debug';
import hljs from 'highlight.js';
import * as path from 'path';
import {readdirSync} from 'fs';
import {fileURLToPath} from 'url';

import helpers from './helpers.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

Metalsmith(__dirname)
  .source('./src')
  .destination('./build')
  .clean(true)
  // assign basename metadata
  .use((files, metalsmith, done) => {
    Object.keys(files).forEach(fname => {
      files[fname].basename = path.basename(fname, path.extname(fname))
    });
    done();
  })
  .use(collections({
    posts: 'content/posts/*.md',
    projects: 'content/projects/*.md',
  }))
  .use(useTemplate({
    posts: 'post.hbt',
    projects: 'post.hbt',
    pages: 'post-list.hbt'
  }))
  .use(markdown({
    smartypants: true,
    highlight: (code, lang, callback) => {
      return hljs.highlight(lang, code).value;
    }
  }))
  .use(excerpts())
  .use(permalinks({
    pattern: ':collection/:basename',
    relative: false,
  }))
  .use(tags({
    handle: 'tags',
    template: 'post-list.hbt',
  }))
  .use(templates({
    engine: 'handlebars',
    directory: 'templates',
    partials: readdirSync(__dirname + '/templates/partials')
      .reduce((partials, f) => {
        var b = path.basename(f, path.extname(f));
        partials[b] = 'partials/' + b;
        return partials;
      }, {}),
    helpers: helpers
  }))
  // .use(function(files, ms, done){ _.each(files, function(f, n) { console.log(n, _.omit(f, 'stats', 'contents')); }); done(); })
  .use(less())
  // .use(debug())
  // .use((files) => {
  //   console.log(files)
  // })
  .build(function(err) {
    console.log('done');
    if (err) console.dir(err);
    // if (err) throw err;
  });

function useTemplate(config) {
  return (files, metalsmith, done) => {
    Object.values(files).forEach(f => {
      const c = f.collection.find(c => c in config);
      if (!f.template && c) {
        f.template = config[c]
      }
    });
    done();
  };
}
