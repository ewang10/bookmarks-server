function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'title1',
            url: 'url1',
            description: 'description1',
            rating: 1
        }, {
            id: 2,
            title: 'title2',
            url: 'url2',
            description: 'description2',
            rating: 2
        }, {
            id: 3,
            title: 'title3',
            url: 'url3',
            description: 'description3',
            rating: 3
        }, {
            id: 4,
            title: 'title4',
            url: 'url4',
            description: 'description4',
            rating: 4
        }
    ];
}

function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        rating: 5,
        url: 'some url',
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
    }
    const expectedBookmark = {
        ...maliciousBookmark,
        title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
    return {
        maliciousBookmark,
        expectedBookmark,
    }
}

module.exports = { makeBookmarksArray, makeMaliciousBookmark };