const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures');

describe.only('Bookmarks Endpoints', () => {
    let db;
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db('bookmarks').truncate());

    afterEach('cleanup', () => db('bookmarks').truncate());

    describe('GET /bookmarks', () => {
        context('Given there are no bookmarks', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });
        context('Given there are bookmarks in the db', () => {
            const testBookmarks = makeBookmarksArray();
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            });

        });

        context('Given an XSS attack bookmark', () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark();
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark]);
            });
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title);
                        expect(res.body[0].description).to.eql(expectedBookmark.description);
                    });
            });
        });
    });
    describe('GET /bookmarks/:bookmark_id', () => {
        context('Given no bookmarks', () => {
            it('responds 404', () => {
                const bookmarkId = 1234;
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: `bookmark doesn't exist`}});
            })
        })
        context('Given there are bookmarks in the db', () => {
            const testBookmarks = makeBookmarksArray();
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });
            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            });

        });

        context('Given an XSS attack bookmark', () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark();
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark]);
            });
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title);
                        expect(res.body.description).to.eql(expectedBookmark.description);
                    });
            });
        });

    });

    describe('POST /bookmarks', () => {
        
        it('creates a bookmark responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: "new title",
                url: "new url",
                description: 'new description',
                rating: 5
            }
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.description).to.eql(newBookmark.description);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(postRes.body)
                );
        });

        const requiredFields = ['title', 'url', 'rating'];
        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Testing new bookmark',
                url: 'Testing new url',
                rating: 5
            };

            it(`responds with 400 and an error message when the ${field} is missing`, () => {
                delete newBookmark[field];

                return supertest(app)
                    .post('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });
        });

        context('Given an XSS attack bookmark', () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark();
            
            it.only('removes XSS attack content', () => {
                return supertest(app)
                    .post(`/bookmarks`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send([maliciousBookmark])
                    .expect(201)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title);
                        expect(res.body.description).to.eql(expectedBookmark.description);
                    });
            });
        });

    });

    describe('DELETE /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const idToRemove = 1234;
                return supertest(app)
                    .delete(`/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: `bookmark doesn't exist` } })
            })
        })
        context('Given there are bookmarks in the db', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 204 and removes the bookmark', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

                return supertest(app)
                    .delete(`/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get('/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks);
                    });
            });
        });

        
    });
});