import fs from 'fs';
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import { fileURLToPath } from "url";
import multer from 'multer'

const { combine, timestamp, printf } = winston.format;

function getLogger() {
  let date = new Date().toISOString();

  const logFormat = winston.format.printf(function (info) {
    return `${date}-${info.level}: ${JSON.stringify(info.message, null, 4)}\n`;
  });

  const logger = winston.createLogger({
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss', }), logFormat,
    ),
    transports: [
      // info 레벨 로그를 저장할 파일 설정
      new winstonDaily({
        level: 'info',
        datePattern: 'YYYY-MM-DD',
        dirname: 'logs',
        filename: `%DATE%.log`,
        maxFiles: 30,  // 30일치 로그 파일 저장
        zippedArchive: true,
      }),
      // error 레벨 로그를 저장할 파일 설정
      new winstonDaily({
        level: 'error',
        datePattern: 'YYYY-MM-DD',
        dirname: 'logs/error',  // error.log 파일은 /logs/error 하위에 저장 
        filename: `%DATE%.error.log`,
        maxFiles: 30,
        zippedArchive: true,
      }),
    ],
  });

  return logger;
}

function getImage(fs_item, data, dataBox) {
  let encode = Buffer.from(fs_item).toString('base64'); //파일 인코딩
  let decode = Buffer.from(encode, 'base64'); //파일 디코딩

  fs.writeFileSync(`./public/img/${data}.png`, decode);

  fs.readdir('./public/img', (err, files) => {
    files.forEach(item => {
      if (![`A70_${dataBox.front}.png`, `${dataBox.end}.png`].includes(item)) {
        fs.unlink(`./public/img/${item}`, (err) => { if (err) return; })
      }
    });
  });
}

function getDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Adding 1 since getMonth() returns 0-indexed months
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');

  return `${year}${month}${day}${hours}`;
}

function DistImg(param) {
  switch (param.srvyYMD) {
    case '20240416':
      return [process.env.IMG_PATH_20240416_A70 + param.path + '/' + param.path + '_A70/', process.env.IMG_PATH_20240416_STS + param.path + '/' + param.path + '_도로현황/'];
    case '20240529':
      return [process.env.IMG_PATH_20240529_A70, process.env.IMG_PATH_20240529_STS];
    case '20240601':
      return [process.env.IMG_PATH_20240601_A70, process.env.IMG_PATH_20240601_STS];
    case '20240609':
      return [process.env.IMG_PATH_20240609_A70, process.env.IMG_PATH_20240609_STS];
  }
}

let getNewData = async (con, setData, getReq, flag, rowCount) => {
  console.table({
    geom: `ST_GeomFromText('POINT (${setData['Latitude[deg]']} ${setData['Longitude[deg]']})', 4326)`,
    dis: `${flag == 0 ? setData['Distance[mm]'] : setData['Distance[mm]'].slice(0, -3) + '000'}`,
    lat: `${setData['Latitude[deg]']}`,
    lon: `${setData['Longitude[deg]']}`,
    hwName: `'${getReq.file.originalname.split('_')[0]}'`,
    route_00: `'${getReq.file.originalname.split('_')[1]}'`,
    lane: `${Number(getReq.file.originalname.split('_')[3].replace(/[^0-9]/gi, ''))}`,
    middle_time: `'${getReq.file.originalname.split('_')[2]}'`,
    filename: getReq.file.originalname,
    srvy_ymd: `${setData['srvy_ymd']}`,
    rowCount: rowCount
  });

  await new Promise((resolve, reject) => {
    return con.query(`
      INSERT INTO rdth_newdt (
          geom, distance, lat, lon, hw_name, route_00, lane, middle_time, srvy_ymd
      ) values (
          ST_GeomFromText('POINT (${setData['Longitude[deg]']} ${setData['Latitude[deg]']})', 4326),
          ${flag == 0 ? setData['Distance[mm]'] : setData['Distance[mm]'].slice(0, -3) + '000'},
          ${setData['Latitude[deg]']},
          ${setData['Longitude[deg]']},
          '${getReq.file.originalname.split('_')[0]}',
          '${getReq.file.originalname.split('_')[1]}',
          ${Number(getReq.file.originalname.split('_')[3].replace(/[^0-9]/gi, ''))},
          '${getReq.file.originalname.split('_')[2]}',
          '${setData['srvy_ymd']}'
      )
    `, (err, queryRes) => {
      if (err) {
        reject(err);
      } else {
        resolve(queryRes);
      }
    });
  });
}

let getUpload = async (con, setData, getReq, getRes, flag, count, max) => {

  console.table({
    dis: setData['Distance[mm]'],
    latlon: `${setData['Longitude[deg]']}, ${setData['Latitude[deg]']}`
  })

  return con.query(`
    WITH ref_point AS (
        SELECT ST_SetSRID(ST_MakePoint(${setData['Longitude[deg]']}, ${setData['Latitude[deg]']}), 4326) AS geom
    )
    SELECT
        pointgeom as public,
        ref_point.geom as private,
        lat, 
        lon, 
        trunc((prj - 0.22) :: numeric , 1) as prj,
        ST_DistanceSphere( pointgeom, ref_point.geom) AS sub_distance,
        (prj - 0.22) + (ST_DistanceSphere( pointgeom, ref_point.geom) * 0.001)AS re_prj
    FROM rdth_coordinate gp , ref_point
    ORDER BY
        ST_DistanceSphere( pointgeom, ref_point.geom)
    limit 1;
  `, (err, res) => {
    if (res != undefined) {
      res.rows.forEach(row => {
        console.table({
          dis: setData['Distance[mm]'],
          prj: row.prj,
          re_prj: row.re_prj,
          f: row.re_prj.toString().split(".")[0],
          e: row.re_prj.toString().split(".")[1].slice(0, 2)
        });

        fs.appendFile(
          `${process.env.LOCAL_DEST_PATH}${getReq.file.originalname}_${getDate(new Date())}.csv`,
          `${setData.id},${flag == 0 ? setData['Distance[mm]'] : setData['Distance[mm]'].slice(0, -3) + '000'},${row.lat}, ${row.lon}, ${row.sub_distance},${row.re_prj.toString().split(".")[0]}.${row.re_prj.toString().split(".")[1].slice(0, 2)},${row.re_prj.toString().split(".")[0]}.${row.re_prj.toString().split(".")[1].slice(0, 3)}\n`
          , (err, res) => {
            if (err) {
              throw err
            }
          }
        );
      });
      if (max == count) {
        getRes.status(200).send('end of file');
      }
    }
  });
}

let getOption = (body) => {
  switch (body.reg_name) {
    case '':
      return [`select 
              hw_name,
              route_00,
              lane,
              middle_time,
              srvy_ymd
          from rdth_newdt rn 
          ${body.srvyYMD == 'all'
          ? ''
          : `where srvy_ymd = '${body.srvyYMD}'`}
          group by 
              hw_name,
              route_00,
              lane,
              middle_time,
              srvy_ymd`];
    default:
      return [`select 
          rn.hw_name,
          rn.route_00,
          rn.lane,
          rn.middle_time
      from rdth_newdt rn
      inner join rdth_newdt_reg_user rnru 
      on concat(rn.srvy_ymd, '_', rn.hw_name, '_', rn.route_00,'_', rn.lane,  '_', rn.middle_time,'_',rn.distance) = rnru.srvy_key
      where rnru.reg_name = '${body.reg_name}' and rn.srvy_ymd = '${body.srvyYMD}'
      group by rn.hw_name,
          rn.route_00,
          rn.lane,
          rn.middle_time`];
  }
}

const __dirname = (prefix) => fileURLToPath(new URL(prefix, import.meta.url));
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.LOCAL_DEST_PATH)
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

const upload = multer({ storage });

export { getImage, getLogger, getDate, __dirname, upload, getNewData, getUpload, DistImg, getOption };