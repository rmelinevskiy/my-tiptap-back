import express from "express";
import expressWebsockets from "express-ws";
import { Server } from "@hocuspocus/server";

// Конфигурация Hocuspocus
const server = Server.configure({
    name: "test1",
    port: 1234,
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
        console.log(data)
    }
    // Дополнительные параметры конфигурации, если нужно
});

// Настройка Express с использованием express-ws
const { app } = expressWebsockets(express());

// Простейший HTTP маршрут
app.get("/", (request, response) => {
    response.send("Hello World!");
});

// Добавление WebSocket маршрута для Hocuspocus
app.ws("/collaboration", (websocket, request) => {
    const context = {
        user: request.user || { id: 1234, name: "Jane" }, // Используйте декодированные данные токена или дефолтные данные
    };
    server.handleConnection(websocket, request, context);
});

// Запуск сервера
app.listen(1234, () => console.log("Сервер запущен на http://127.0.0.1:1234"));
