require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const {NODE_ENV} = require('./config');
const logger = require('./logger');
//const bookmarkRouter = require('./bookmark/bookmark-router');
const BookmarksService = require('./bookmarks-service');

const app = express();

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN;
    const authToken = req.get('Authorization')

    if(!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({error: 'Unauthorized request'});
    }
    next();
})

//app.use(bookmarkRouter);

app.get('/bookmarks', (req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks);
        })
        .catch(next);
});

app.get('/bookmarks/:bookmark_id', (req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getById(knexInstance, req.params.bookmark_id)
        .then(bookmark => {
            if(!bookmark) {
                return res.status(404).json({
                    error: {message: `bookmark doesn't exist`}
                });
            }
            res.json(bookmark);
        })
        .catch(next);
});

app.use(function errorHandler(error, req, res, next) {
    let response;
    if(NODE_ENV === 'production') {
        response = {error: {message: 'server error'}};
    } else {
        console.log(error);
        response = {message: error.message, error};
    }
    res.status(500).json(response);
});

module.exports = app;