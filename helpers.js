import {basename} from 'path';
import moment from 'moment';

// NOTE: handlebars helpers are bound with this==template context
export default {
  json: JSON.stringify,
  formatDate: function (date) {
    // sigh
    date.setHours(date.getHours()+5);
    return moment(date).format('YYYY-MM-DD');
  },
  debug: function (obj) {
    return JSON.stringify({
      ...obj,
      contents: '...',
      stats: '...',
    });
  },
  activePage: function(page) {
    if (basename(this.path) == page || (this.collection && this.collection.includes(page))) {
      return 'active';
    }
    return '';
  },
  or: function(...args) {
    return args.some(x => x)
  },
  setAndFalse: function(x) {
    return x === false;
  }
};