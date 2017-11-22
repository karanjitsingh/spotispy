'use strict';

const electronLocalshortcut = require('electron-localshortcut');
const electron = require('electron');
const request = require('request');

// Module to control application life.
const app = electron.app;

let screen;
let displays;
let currentDisplay = 0;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 1366, height: 790, title: "Spotsipy"});
	mainWindow.setMenu(null);

	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/index.html');

	// Open the DevTools.
	//mainWindow.webContents.openDevTools();

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	screen = electron.screen;
	displays = screen.getAllDisplays();
	console.log('enumerated', displays.length, 'displays.');
	mainWindow.setFullScreen(true);

	// register two local shortcuts
	electronLocalshortcut.register('CommandOrControl+Shift+Left', function() {
		currentDisplay--;
		if (currentDisplay < 0) {
			currentDisplay = displays.length - 1;
		}
		currentDisplay%=(displays.length);
		console.log('switching to display', currentDisplay + 1, 'out of', displays.length);
		mainWindow.setFullScreen(false);
		setTimeout(function() {
			mainWindow.setBounds(displays[currentDisplay].bounds);
			mainWindow.setFullScreen(true);
		}, 100);
	});

	electronLocalshortcut.register('CommandOrControl+Shift+Right', function() {
		currentDisplay++;
		currentDisplay%=(displays.length);
		console.log('switching to display', currentDisplay + 1, 'out of', displays.length);
		mainWindow.setFullScreen(false);
		setTimeout(function() {
			mainWindow.setBounds(displays[currentDisplay].bounds);
			mainWindow.setFullScreen(true);
		}, 100);
	});

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
process.on('uncaughtException', function (error) {
	console.log("Exception: ", error);
});

const https = require('https');

const SERVER_PORT = 5000;
const UPDATE_INTERVAL = 1000;
const DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap'];
// const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';
let spotifyPortOffset = 0;
const DEFAULT_HTTPS_CONFIG = {
	host: '',
	port: 4380,
	path: '',
	headers: {
		'Origin': 'https://open.spotify.com',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
	}
};

let config;
let version;
version = {};
version.running = false;
let csrf;
let oauth;
let currentTrack;
let coverUrl;

function copyConfig() {
	let configCopy = JSON.parse(JSON.stringify(DEFAULT_HTTPS_CONFIG));
	configCopy.port += (spotifyPortOffset % 20);
	return configCopy;
}

function generateLocalHostname() {
	return '127.0.0.1';
}

function generateUrl(host, port, path) {
	return `http${port == 443 ? 's' : ''}://${host}:${port}${path}`;
}


function getJson(config, callback, log) {
	var options = {
    	url: generateUrl(config.host, config.port, config.path),
    	rejectUnauthorized: false,
    	headers: config.headers
	};
	
	if(log)
	console.log(options);

	request(options, function (error, response, body) {
		callback(body !==undefined ? JSON.parse(body) : undefined, body === undefined ? error : undefined);
	});
}

function getCurrentAlbumId() {
	config = copyConfig();
	config.host = generateLocalHostname();
	config.path = '/remote/status.json?oauth=' + oauth + '&csrf=' + csrf + '&returnafter=1&returnon=' + DEFAULT_RETURN_ON.join();
	getJson(config, function(data,port,log) {
		try {
			const trackId = data.track.track_resource.uri.split(':')[2];
			if (data.track.track_resource.uri !== currentTrack) {
				currentTrack = data.track.track_resource.uri;

				mainWindow.webContents.send('loadingText', 'Fetching album art');
				getAlbumCover(data.track.album_resource.uri, data.track.track_resource.uri);
				
				if (mainWindow !== null) {
					mainWindow.webContents.send('seek', data.playing_position/data.track.length);
					mainWindow.webContents.send('title', data.track.track_resource.name);
					mainWindow.webContents.send('album', data.track.album_resource.name);
					mainWindow.webContents.send('artist', data.track.artist_resource.name);
				}
			}
			else
				if (mainWindow !==null)
					mainWindow.webContents.send('seek', data.playing_position/data.track.length);
		}
		catch(ex) {
			console.log(ex);
		}
	});
}

function getAlbumCover(id, uri) {
	config = copyConfig();
	config.host = 'open.spotify.com';
	config.path = '/oembed?url=' + id;
	config.port = 443;

	getJson(config, function(data) {
		if(coverUrl != data.thumbnail_url) {
			coverUrl = data.thumbnail_url;
			if (mainWindow !== null) {
				if (uri == currentTrack)
					mainWindow.webContents.send('coverUrl', coverUrl);
			}
		}
	});
}

function getSearchInfo(query) {
	query = encodeURI(query)
	config = copyConfig();
	config.host = 'api.spotify.com';
	config.path = '/v1/search?q=' + query + '&type=track,artist,album';
	config.port = 443;

	config.headers['Authorization'] = "Bearer " + oauth;

	getJson(config, function(data) {
		if (mainWindow !== null) {
			data.query = query;
			mainWindow.webContents.send('searchResults', data);
		}
	});
}

function play(uri) {
	config = copyConfig();
	config.host = generateLocalHostname();
	config.path = '/remote/play.json?oauth=' + oauth + '&csrf=' + csrf + '&uri=' +  uri;
	config.headers = config.headers || {};
	// config.headers['User-Agent'] = USER_AGENT;
	https.get(config);
}

global.getSearchInfo = getSearchInfo;
global.play = play;

function grabTokens() {
	if (mainWindow !== null) {
		mainWindow.webContents.send('loadingText', 'Connecting to Spotify');
	}
	config = copyConfig();
	config.host = generateLocalHostname();
	config.path = '/simplecsrf/token.json';
	getJson(config, function(data) { csrf = data.token; });
	config.host = 'open.spotify.com';
	config.path = '/token';
	config.port = 443;
	getJson(config, function(data) { oauth = data.t; });
	let updateTrackCover;

	process.stdout.write("Waiting for authentication.");

	let waitForRequest = setInterval(function() {
		if (typeof csrf !== 'undefined' && typeof oauth !== 'undefined') {
			clearInterval(waitForRequest);
			process.stdout.write('\n');
			updateTrackCover = setInterval(getCurrentAlbumId, UPDATE_INTERVAL);
		}
		else {
			process.stdout.write('.');
		}
	}, 500);
}

function init() {
	config = copyConfig();
	config.host = generateLocalHostname();
	config.path = '/service/version.json?service=remote';

	console.log(config.port);

	getJson(config, function(data, error) {
		if(error) {
			console.log("Trying new port")
			spotifyPortOffset = (spotifyPortOffset + 1) % 20;
			waitForSpotify = setTimeout(init, 500);
			return;
		}


		if (!('running' in data)) {
			data.running = true;
		}
		version = data;

		console.log("Grabbing tokens");
		grabTokens();
	});
	console.log('Looking for spotify at port ' + config.port);
}

let waitForSpotify = setTimeout(init, 500);
