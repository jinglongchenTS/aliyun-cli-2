#!/usr/bin/env node

"use strict";

var fs = require('fs');
var process = require('process');
var glob = require('glob');
var globSync = glob.sync || glob.globSync;
var async = require('async');
var basecmd = require('../src/basecmd');
var oss = require('../src/oss');
var cdn = require('../src/cdn');
var argv = require('yargs')
    .option('id', {
        alias : 'id',
        demand: false,
        describe: 'accessKeyId',
        type: 'string'
    })
    .option('key', {
        alias : 'key',
        demand: false,
        describe: 'secretAccessKey',
        type: 'string'
    })
    .option('bucket', {
        alias : 'bucket',
        demand: false,
        describe: 'bucket',
        type: 'string'
    })
    .option('osspath', {
        alias : 'osspath',
        demand: false,
        describe: 'oss path',
        type: 'string'
    })
    .option('endpoint', {
        alias : 'endpoint',
        demand: false,
        describe: 'endpoint',
        type: 'string'
    })
    .option('islocal', {
        alias : 'islocal',
        demand: false,
        describe: 'islocal',
        type: 'boolean'
    })
    .option('cdn', {
        alias : 'cdn',
        demand: false,
        describe: 'cdn url',
        type: 'string'
    })
    .usage('Usage: oss-cli input-filename')
    .example('oss-cli input-filename', 'oss-cli input-filename')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2015')
    .argv;

let basearr = argv._;
if (basearr == undefined || basearr.length < 1) {
    console.log('Usage: oss-cli input-filename');

    process.exit(1);
}

if (!basecmd.checkParams(argv, 'id', 'key', 'bucket', 'endpoint')) {
    process.exit(1);
}

let islocal = false;
if (argv.hasOwnProperty('islocal') && argv.islocal != undefined) {
    islocal = argv.islocal;
}

let osspath = '';
if (argv.hasOwnProperty('osspath') && argv.osspath != undefined) {
    osspath = basecmd.procOSSPath(argv.osspath);
}

let cdnurl = '';
if (argv.hasOwnProperty('cdn') && argv.cdn != undefined) {
    cdnurl = basecmd.procOSSPath(argv.cdn);
}

let id = argv.id;
let key = argv.key;
let bucket = argv.bucket;
let endpoint = argv.endpoint;

let ossobj = oss.newOSS(id, key, endpoint, islocal);
let cdnobj = cdn.newCDN(id, key);

let arr = [];
for (let j = 0; j < basearr.length; ++j) {
    if (basecmd.isDir(basearr[j])) {
        let lstfile = globSync(basearr[j] + '/**/*');
        for (var i = 0; i < lstfile.length; ++i) {
            let srcfile = lstfile[i];
            if (fs.existsSync(srcfile)) {
                arr.push(srcfile);

                console.log('parse file ' + srcfile);
            }
        }
    }
    else {
        let lstfile = globSync(basearr[j]);
        for (var i = 0; i < lstfile.length; ++i) {
            let srcfile = lstfile[i];
            if (fs.existsSync(srcfile)) {
                arr.push(srcfile);

                console.log('parse file ' + srcfile);
            }
        }
    }
}

console.log('total file nums is ' + arr.length);

let curindex = 0;
async.eachSeries(arr, function (curfile, callback) {
    oss.updFile(ossobj, bucket, curfile, osspath, function (err, data) {
        curindex++;

        if (err) {
            console.log('updFile ' + curindex + ' ' + curfile + ' err ' + JSON.stringify(err));
        }
        else {
            console.log('updFile ' + curindex + ' ' + curfile);
        }

        if (cdnurl.length > 0) {
            let fullcdn = cdnurl + '/' + osspath + '/' + curfile;
            cdn.refreshFile(cdnobj, cdnurl, osspath + '/' + curfile, function (err, res) {
                if (err) {
                    console.log('refurbish CDN ' + fullcdn + ' err ' + JSON.stringify(err));
                }
                else {
                    console.log('refurbish CDN ' + fullcdn);
                }

                callback();
            });
        }
        else {
            callback();
        }
    });
}, function (err) {

});
