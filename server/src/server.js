import express from 'express';
import morgan from 'morgan';
import socketio from 'socket.io';
import http from 'http';

import config from './config';
import logger from './logger';
import Database from './Database';
import LinksTree from './LinksTree';
import Updater from './Updater';

var database = new Database();
var linksTree = new LinksTree(database);
var app = express();
app.use(morgan('dev'));

// Allow CORS
app.use(function(req, res, next) {
  'use strict';

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

app.get('/api/tree', function(req, res) {
  'use strict';

  linksTree.getLinksTree(config.url)
    .on('done', function(tree) {
      res.json(tree);
    });
});

var server = http.createServer(app).listen(3000, function() {
  'use strict';

  logger.info('Express server started!');
});

var io = socketio(server);

var updater = new Updater(config.url, config.defaultDepth, database);
updater.start()
  .on('modified', function(url) {
    'use strict';
    logger.log('verbose', '[Updater] An url has been changed ' + url);
  })
  .on('added', function(url) {
    'use strict';
    logger.log('verbose', '[Updater] New link found and indexed ' + url);
  })
  .on('changed', function(url) {
    'use strict';
    logger.log('verbose', '[Updater] Change detected on ' + url);
  })
  .on('done', function(hasChange) {
    'use strict';
    if (hasChange) {
      logger.log('verbose', '[Updater] Something change, dropping cache');
      database.uncahe(config.url);
      io.sockets.emit('updated', 'everyone');
    }
  });
