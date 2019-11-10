const express = require('express');
const logger = require('../logger');
const uuid = require('uuid/v4');
const bookmarks = require('../store');
const BookmarksService = require('./bookmarks-service');
const xss = require('xss');

const bookmarkRouter = express.Router();
const parseBody = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: bookmark.rating
})

bookmarkRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark));
            })
            .catch(next);
    })
    .post(parseBody, (req, res, next) => {
        const { title, url, description = '', rating } = req.body;

        const newBookmark = { title, url, description, rating };

        for (const [key, value] of Object.entries(newBookmark)) {
            if (value == null) {
                logger.error(`${key} is required`)
                return res.status(400).json({
                    error: {message: `Missing '${key}' in request body`}
                });
            }
        }

        if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating '${rating}' supplied`);
            return res.status(400).send(`'rating' must be a number between 0 and 5`);
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                logger.info(`Bookmark with id ${bookmark.id} created.`);
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(serializeBookmark(bookmark));
            })
            .catch(next);
    });

bookmarkRouter
    .route('/bookmarks/:id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.info(`Bookmark with id ${req.params.id} created.`);
                    return res.status(404).json({
                        error: { message: `bookmark doesn't exist` }
                    });
                }
                res.bookmark = bookmark;
                next();
            })
            .catch(next);
    })
    .get((req, res, next) => {
        res.json(serializeBookmark(res.bookmark));
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db');
        BookmarksService.deleteBookmark(knexInstance, req.params.id)
            .then(() => {
                logger.info(`Bookmark with id ${req.params.id} deleted.`);
                res.status(204).end();
            })
            .catch(next);
        
    });

module.exports = bookmarkRouter;

