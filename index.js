var Metalsmith  = require('metalsmith'),
    markdown    = require('metalsmith-markdown'),
    templates   = require('metalsmith-templates'),
    collections = require('metalsmith-collections'),
    permalinks  = require('metalsmith-permalinks'),
    less        = require('metalsmith-less'),
    tags        = require('metalsmith-tags'),
    excerpts    = require('metalsmith-excerpts'),
    pagination  = require('metalsmith-pagination'),
    hljs        = require('highlight.js'),
    path        = require('path'),
    fs          = require('fs'),
    moment      = require('moment'),
    config      = require('./config')(process.argv),
    _           = require('lodash');

var partials = {};
_.each(fs.readdirSync(__dirname + '/templates/partials'), function(f) {
  var b = path.basename(f, path.extname(f));
  partials[b] = 'partials/' + b; 
});

Metalsmith(__dirname)
  .use(collections({
    posts: {
      pattern: 'content/posts/*.md'
    },
    projects: {
      pattern: 'content/projects/*.md'
    }
  }))
  .use(assignBasenames)
  .use(useTemplate({
    posts: 'post.hbt',
    projects: 'post.hbt',
    pages: 'post-list.hbt'
  }))
  .use(markdown({
    smartypants: true,
    highlight: function (code, lang, callback) {
      return hljs.highlightAuto(code).value;
    }
  }))
  .use(excerpts())
  .use(tags({
    handle: 'tags',
    path: 'tags',
    template: 'post-list.hbt'
  }))
  .use(permalinks({
    pattern: ':collection/:basename',
    relative: false
  }))
  .use(templates({
    engine: 'handlebars',
    directory: 'templates',
    partials: partials,
    helpers: {
      json: JSON.stringify,
      formatDate: function(date) {
        // sigh
        date.setHours(date.getHours()+5);
        return moment(date).format('YYYY-MM-DD');
      },
      debug: function(obj) {
        obj.contents = '...';
        obj.stats = '...';
        return JSON.stringify(obj);
      },
      activePage: function(page) {
        if (path.basename(this.path) == page || _.indexOf(this.collection, page) !== -1) {
          return 'active';
        }
        return '';
      },
      link: function(path) {
        return config.baseUrl + '/' + path;
      },
      or: function() {
        return _.any(arguments);
      },
      setAndFalse: function(x) {
        return x === false;
      }
    }
  }))
  // .use(function(files, ms, done){ _.each(files, function(f, n) { console.log(n, _.omit(f, 'stats', 'contents')); }); done(); })
  .use(less())
  .destination('./build')
  .build(function(err) {
    console.log('done');
    if (err) console.dir(err);
    // if (err) throw err;
  });

function useTemplate(config) {
  return function(files, metalsmith, done) {
    _.each(files, function(f, fname) {
      var c = _.find(f.collection, _.partial(_.has, config));
      if (!f.template && c) {
        f.template = config[c];
      }
    });
    done();
  };
}

function assignBasenames(files, metalsmith, done) {
  _.each(files, function(f, fname) {
    f.basename = path.basename(fname, path.extname(fname));
    // console.log(f);
  });
  done();
}
