import dotenv from 'dotenv';
import path from 'path';
import { __dirname } from './util.js';


const evnConfig = function (eviroment) {
    // console.log(eviroment);
    if (process.env.NODE_ENV === 'prd') dotenv.config({ path: path.join(__dirname('.'), '.env.prd') });
    if (process.env.NODE_ENV === 'local') dotenv.config({ path: path.join(__dirname('.'), '.env.local') });

    // console.log("pass");
}

export default evnConfig;