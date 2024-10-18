import eviroment from './config/env.js';
import bodyParser from 'body-parser';
import path from 'path';
import express from 'express';
import {
    getLogger,
    __dirname,
} from './config/util.js';
import { LocalStorage } from "node-localstorage";

let app = express();
let localStorage = new LocalStorage('./scratch');

eviroment(process.env.NODE_ENV); // 환경설정

app.use(express.static(path.join(__dirname('../'), 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile('vhimain.html', { root: __dirname('../') });
});

app.listen(process.env.ST_PORT, function (res, req) {
    let star = '';
    getLogger().info(`RDTH NODE LOCAL STORAGE : ${localStorage.getItem('load')}`);
    getLogger().info(`RDTH NODE START PORT : ${process.env.ST_PORT}`);

    for (let index = 0; index < 100; index++) { star += '*'; }
    console.log(star);
    console.log(`RDTH NODE START PORT : ${process.env.ST_PORT}`);
    console.log(star);
});