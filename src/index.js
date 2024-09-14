import express from "express";
import expressWebsockets from "express-ws";
import {Server} from "@hocuspocus/server";
import {Database} from "@hocuspocus/extension-database";
import {TiptapTransformer} from "@hocuspocus/transformer";
import Pool from "pg-pool"; // Импортируем библиотеку pg для работы с PostgreSQL
import {Throttle} from "@hocuspocus/extension-throttle";

const pool = new Pool({
    database: '', // name of bd
    user: '', // user name
    password: '', // password
    port: 5432,
    max: 20, // set pool max size to 20
    idleTimeoutMillis: 1000, // close idle clients after 1 second
    connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
    maxUses: 7500,  // Время простоя перед закрытием соединения
});

// Конфигурация Hocuspocus
const server = Server.configure({
    name: "test1",
    port: 5555,
    timeout: 30000,
    debounce: 5000,
    maxDebounce: 30000,
    quiet: true,
    // onConnect: (data) => {
    //     console.log('Новый пользователь подключен:', data);
    // },
    // onDisconnect: (data) => {
    //     console.log('Пользователь отключен:', data);
    // },
    onChange: (data) => {
        const prosemirrorJSON = TiptapTransformer.fromYdoc(data.document);
        console.log(`Document ${data.documentName} changed by ${data.context.user.name}`);
        console.log(prosemirrorJSON.default.content?.[0]?.content)
    },
    // Дополнительные параметры конфигурации, если нужно
    extensions: [
        new Throttle({
            throttle: 200,
            banTime: 1,
        }),

        new Database({
            fetch: async ({documentName}) => {
                return new Promise((resolve, reject) => {
                    console.log("Trying to fetch");
                    pool.query(
                        "SELECT data FROM ydocuments WHERE name = $1 ORDER BY id DESC LIMIT 1", // Изменяем запрос для PostgreSQL
                        [documentName],
                        (error, result) => {
                            if (error) {
                                reject(error);
                            }
                            console.log("data: " + JSON.stringify(result?.rows));
                            if (result?.rows?.length > 0 && result?.rows?.[0]?.data) {
                                resolve(result.rows[0].data);
                            } else {
                                resolve(null);
                            }
                        },
                    );
                });
            },

            store: async ({documentName, state}) => {
                console.log(state)
                pool.query(
                    "INSERT INTO ydocuments (name, data) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data", // Изменяем запрос для PostgreSQL
                    [documentName, state],
                    (error, result) => {
                        if (error) {
                            throw error;
                        }
                        console.log(`inserted/updated ${result}`);
                        console.log(`inserted/updated ${result?.rowCount}`);
                    },
                );
            },
        }),
    ],
});

// Настройка Express с использованием express-ws
const {app} = expressWebsockets(express());

// Простейший HTTP маршрут
app.get("/", (request, response) => {
    response.send("Hello World!");
});

// Добавление WebSocket маршрута для Hocuspocus
app.ws("/collaboration", (websocket, request) => {
    const context = {
        user: request.user || {id: 1234, name: "Jane"}, // Используйте декодированные данные токена или дефолтные данные
    };
    server.handleConnection(websocket, request, context);
});

// Запуск сервера
app.listen(5555, () => console.log("Сервер запущен на http://127.0.0.1:1234"));
