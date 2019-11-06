const express = require('express');
const logger = require('../logger');
const uuid = require('uuid/v4');
const bookmarks = require('../store');

const bookmarkRouter = express.Router();
const parseBody = express.json();

bookmarkRouter
    .route('/bookmarks')
    .get((req, res) => {
        res.json(bookmarks);
    })
    .post(parseBody, (req, res) => {
        const { title, url, description = '', rating = 1 } = req.body;
        if (!title) {
            logger.error('Title required');
            return res.status(400).send('Invalid data');
        }
        if (!url) {
            logger.error('Url required');
            return res.status(400).send('Invalid data');
        }

        if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating '${rating}' supplied`);
            return res.status(400).send(`'rating' must be a number between 0 and 5`);
        }
        const id = uuid();
        const bookmark = {
            id,
            title,
            url,
            description,
            rating
        }
        bookmarks.push(bookmark);
        logger.info(`Bookmark with id ${id} created`);
        res.status(201).location(`http://localhost:8000/bookmarks/${id}`).json(bookmark);
    });

bookmarkRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        const { id } = req.params;
        const bookmark = bookmarks.find(bookmark => bookmark.id == id);
        if (!bookmark) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send('Bookmark Not Found');
        }
        res.json(bookmark);
    })
    .delete((req, res) => {
        const { id } = req.params;
        const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.id == id);
        if (bookmarkIndex === -1) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send('Bookmark Not Found');
        }
        bookmarks.splice(bookmarkIndex, 1);

        logger.info(`Bookmark with id ${id} deleted.`);
        res.status(204).end();
    });

module.exports = bookmarkRouter;

