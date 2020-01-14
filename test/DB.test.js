const { Client } = require('pg/lib');
const nconf = require('nconf/lib/nconf');
nconf.argv().env().file({ file: 'config/config.json' });
const client = new Client(nconf.get('db'));
const args = argv = require('minimist')(process.argv.slice(2));

describe('pg test', () => {
    before(async () => {
        await client.connect();
        console.log('   START TEST');
    });

    it('create tables', async () => {
        if (args.drop) {
            console.log('    TRY TO DROP OLD TABLES');

            const queriesDrop = [
                client.query('DROP TABLE IF EXISTS users CASCADE'),
                client.query('DROP TABLE IF EXISTS dialogs CASCADE'),
                client.query('DROP TABLE IF EXISTS messages CASCADE'),
                client.query('DROP TABLE IF EXISTS videos CASCADE'),
                client.query('DROP TABLE IF EXISTS views CASCADE'),
                client.query('DROP TABLE IF EXISTS "users-dialogs" CASCADE')
            ];

            // You can debug this variable
            const queriesDropResult = await Promise.all(queriesDrop);
        }

        console.log('    TRY TO CREATE TABLES');

        const queriesCreate = [
            client.query('CREATE TABLE users (id BIGSERIAL PRIMARY KEY, avatar VARCHAR(100))'),

            client.query('CREATE TABLE dialogs (' +
                'id BIGSERIAL PRIMARY KEY,' +
                'blocked BOOLEAN,' +
                'created_at TIMESTAMP WITH TIME ZONE DEFAULT (now() at time zone \'utc\'))'),

            client.query('CREATE TABLE messages (' +
                'id BIGSERIAL PRIMARY KEY,' +
                'text VARCHAR(500),' +
                'dialog_id BIGSERIAL REFERENCES dialogs (id),' +
                'user_id BIGSERIAL REFERENCES users (id),' +
                'created_at TIMESTAMP WITH TIME ZONE DEFAULT (now() at time zone \'utc\'))'),

            client.query('CREATE TABLE videos (' +
                'id BIGSERIAL PRIMARY KEY,' +
                'url VARCHAR(100),' +
                'user_id BIGSERIAL REFERENCES users (id),' +
                'dialog_id BIGSERIAL REFERENCES dialogs (id))'),

            client.query('CREATE TABLE views (' +
                'from_user_id BIGSERIAL,' +
                'to_user_id BIGSERIAL,' +
                'video_id BIGSERIAL,' +
                'UNIQUE (from_user_id, to_user_id, video_id))'),

            client.query('CREATE TABLE "users-dialogs" (' +
                'dialog_id BIGSERIAL,' +
                'user_id BIGSERIAL REFERENCES users (id),' +
                'UNIQUE (dialog_id, user_id))')
        ];

        // You can debug this variable
        const queriesCreateResult = await Promise.all(queriesCreate);
    });


    it('insert in tables', async () => {
        console.log('    TRY TO FILL UP TABLES');

        const timestamp = new Date().toGMTString();

        const queriesInsert = [
            client.query(`INSERT INTO users (avatar) VALUES ('/avatars/e6wq78yeih/1/main.jpeg')`),
            client.query(`INSERT INTO users (avatar) VALUES ('/avatars/hqhkjhkwaq/2/main.jpeg')`),
            client.query(`INSERT INTO users (avatar) VALUES ('/avatars/dasd32saxa/3/main.jpeg')`),

            client.query(`INSERT INTO dialogs (blocked, created_at) VALUES (false, '${timestamp}')`),
            client.query(`INSERT INTO dialogs (blocked, created_at) VALUES (false, '${timestamp}')`),

            client.query(`INSERT INTO "users-dialogs" (dialog_id, user_id) VALUES (1, 1)`),
            client.query(`INSERT INTO "users-dialogs" (dialog_id, user_id) VALUES (1, 2)`),
            client.query(`INSERT INTO "users-dialogs" (dialog_id, user_id) VALUES (2, 1)`),
            client.query(`INSERT INTO "users-dialogs" (dialog_id, user_id) VALUES (2, 3)`),

            client.query(`INSERT INTO messages (text, dialog_id, user_id) VALUES ('Добрый вечер!', 1, 1)`),
            client.query(`INSERT INTO messages (text, dialog_id, user_id) VALUES ('Приветствую!', 1, 2)`),
            client.query(`INSERT INTO messages (text, dialog_id, user_id) VALUES ('Как погода в вашем городе?', 1, 1)`),
            client.query(`INSERT INTO messages (text, dialog_id, user_id) VALUES ('Весьма дождливо у нас тут!', 1, 2)`),

            client.query(`INSERT INTO videos (url, user_id, dialog_id) VALUES ('/videos/dasd2da3a/dasnb2z.avi', 2, 1)`),
            client.query(`INSERT INTO videos (url, user_id, dialog_id) VALUES ('/videos/gsdayt67s/27hSXA2.avi', 1, 1)`),
            client.query(`INSERT INTO videos (url, user_id, dialog_id) VALUES ('/videos/asdd11d2d/eyuqwia.avi', 2, 1)`),
            client.query(`INSERT INTO videos (url, user_id, dialog_id) VALUES ('/videos/gsdayt67s/swaj677.avi', 1, 1)`),
            client.query(`INSERT INTO videos (url, user_id, dialog_id) VALUES ('/videos/sa21dsadx/NMD23d1.avi', 1, 1)`),
            client.query(`INSERT INTO videos (url, user_id, dialog_id) VALUES ('/videos/daddsd12d/sfsaq2e.avi', 2, 2)`),

            client.query(`INSERT INTO views (from_user_id, to_user_id, video_id) VALUES (2, 1, 1)`),
            client.query(`INSERT INTO views (from_user_id, to_user_id, video_id) VALUES (1, 2, 2)`),
            // client.query(`INSERT INTO views (from_user_id, to_user_id, video_id) VALUES (2, 1, 3)`),
            // client.query(`INSERT INTO views (from_user_id, to_user_id, video_id) VALUES (1, 2, 4)`),
            // client.query(`INSERT INTO views (from_user_id, to_user_id, video_id) VALUES (1, 2, 5)`),
            // client.query(`INSERT INTO views (from_user_id, to_user_id, video_id) VALUES (2, 3, 6)`),
        ];

        // You can debug this variable
        const queriesInsertResult = await Promise.all(queriesInsert);
    });

    it('select from tables', async () => {
        const userId = args.userId || 1;
        const dialogsLimit = args.dialogsLimit || 10;
        const dialogsOffset = args.dialogsOffset || 0;
        const messageLimit = args.messageLimit || 10;

        const queriesSelect = [
            client.query(
                'WITH ud AS (' +
                '   SELECT DISTINCT ON ("users-dialogs".user_id)' +
                '           "users-dialogs".user_id AS uId,' +
                '           "users-dialogs".dialog_id AS dialog_id' +
                '       FROM "users-dialogs" AS users_in_dialogs ' +
                '       LEFT JOIN "users-dialogs" ON ("users-dialogs".dialog_id = users_in_dialogs.dialog_id) ' +
                '       WHERE users_in_dialogs.user_id = ' + userId + ' ),' +
                'u_dialogs AS (' +
                '   SELECT DISTINCT ON (dialogs.id) * FROM dialogs ' +
                '   LEFT JOIN ud ON (ud.dialog_id = dialogs.id)),' +
                'u_videos AS (' +
                '   SELECT * ' +
                '   FROM videos' +
                '   LEFT JOIN ud ON (ud.dialog_id = videos.dialog_id)' +
                '   WHERE ud.uId != ' + userId + ' AND videos.user_id = ' + userId + '),' +
                'viewed_videos AS (' +
                '   SELECT * FROM views WHERE views.video_id IN (SELECT id FROM u_videos)), ' +
                'viewed_data AS (' + //
                '   SELECT DISTINCT ON (total)' +
                '       u_videos.user_id AS user_id,' +
                '       COUNT(viewed_videos.video_id) AS viewed,' +
                '       COUNT(u_videos.id) AS total' +
                '   FROM viewed_videos ' +
                '   LEFT JOIN u_videos ON (viewed_videos.from_user_id = u_videos.user_id)' +
                '   GROUP BY u_videos.user_id, u_videos.id), ' +
                'is_viewed AS (' +
                '   SELECT' +
                '       viewed_data.user_id AS user_id,' +
                '       CASE WHEN viewed_data.viewed = viewed_data.total THEN true' +
                '            ELSE false' +
                '       END AS viewed' +
                '   FROM viewed_data) ' +
                'SELECT' +
                '       ud.dialog_id AS id,' +
                '       users.avatar AS avatar,' +
                '       u_dialogs.blocked AS blocked,' +
                '       u_dialogs.created_at AS  created_at,' +
                '       is_viewed.viewed AS viewed,' +
                '       ud.uid AS interlocutor_id' +
                '   FROM ud' +
                '   LEFT JOIN users ON (users.id = ud.uid)' +
                '   LEFT JOIN u_dialogs ON (u_dialogs.id = ud.dialog_id)' +
                '   LEFT JOIN is_viewed ON (is_viewed.user_id = ' + userId + ')' +
                '   WHERE ud.uid != ' + userId +
                `   LIMIT ${dialogsLimit} OFFSET ${dialogsOffset}`
            ),
            client.query('SELECT ' +
                'messages.text AS text, ' +
                'messages.user_id AS user_id, ' +
                'messages.created_at AS created_at ' +
                'FROM "users-dialogs" AS ud ' +
                'LEFT JOIN messages ON (ud.dialog_id = messages.dialog_id)' +
                'WHERE ud.user_id = ' + userId + ' ' +
                'ORDER BY messages.created_at DESC ' +
                `LIMIT ${messageLimit}`)
        ];

        // You can debug this variable
        const queriesSelectResult = await Promise.all(queriesSelect);
        console.log('DIALOGS', queriesSelectResult[0].rows);
        console.log('MESSAGES', queriesSelectResult[1].rows);

    });

    after(async () => {
        console.log('   TEST DONE');
        await client.end();
    });
});
