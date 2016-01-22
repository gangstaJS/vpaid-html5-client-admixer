'use strict';

var Emitter = require('./emit');


var unit, $iframe, $vpaidContainer, interval, state = {}, $skip, contentWindow ,$time;

function createFrame(url) {
	return $('<iframe/>', {src: url, style:'border: 0px !important; width: 100%; height: 100%;'});
};

function VPAIDHTML5mixer(url, player, vpaidContainer, options) {
	var def = $.Deferred();
	interval = null;
	unit = new Emitter({name: 'VAPIDmixer'});

	options.skipTime = options.skipTime || 0;

	state = {
		firstQuartile: true,
		midpoint: true,
		thirdQuartile: true,
		skipHidden: true
	};

	setTimeout(function() { player.pause(); }, 0);

	$vpaidContainer = $(vpaidContainer);
	
	$iframe = createFrame(url);
	$vpaidContainer.empty();

	// --

	$time = $('<div/>', {'class': 'VPAIDtime', text: '0 сек из 0 сек'});

	var $muteBtn = $('<div/>', {'class': 'VPAIDmuteBtn', text: 'Выкл. звук'});

	$muteBtn.on('click', function(e) {
		e.stopPropagation();
		if($(this).hasClass('vpaidMute')) {
			$(this).text('Выкл. звук');
			$(this).removeClass('vpaidMute');
			vpaidPlayer('set:volume=1');
			unit.emit('AdUnmute');
			logw('AdUnmute');
		} else {
			$(this).text('Вкл. звук');
			$(this).addClass('vpaidMute');
			vpaidPlayer('set:volume=0');
			unit.emit('AdMute');
			logw('AdMute');
		}
	});

	// --
	var $a = $('<div/>');
	$a.css({position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'block'});


	var $VPAIDclickableLayer = $('<div/>', {'class': 'VPAIDclickableLayer'});

	$a.append($VPAIDclickableLayer);

	$skip = $('<div/>', {'class': 'VPAIDskipBtn', text: 'Пропустить>>'});

	if(options.skipTime) {
		$skip.on('click', function() {
			removeVPAID('skip');
		});
	}

	$VPAIDclickableLayer.on('click', function() {
		// if(options.adURL) {
			// window.open(options.adURL);
			unit.emit('AdClickThrough');
			logw('AdClickThrough');
			removeVPAID('stop');
		// }
	});

	$vpaidContainer.append($a);
	$a.append($iframe);

	$iframe.on('load', function() {
		
		contentWindow = $iframe.get(0).contentWindow;

		unit.emit('AdCreativeView');
		unit.emit('AdImpression');
		unit.emit('AdStart');

		if(options.debug) {
			logw('AdCreativeView');
			logw('AdImpression');
			logw('AdStart');
		}

		$VPAIDclickableLayer.append($skip, $muteBtn, $time);

		interval = setInterval(function() {
			vpaidPlayer('get:ended|get:currentTime|get:duration');
		}, 1000);

		addEventListener("message", function(e) {
			var res;

			try {
				res = JSON.parse(e.data);

				if(res.admixVPAID) {
					res = res.admixVPAID;
				} else {
					return;
				}

			} catch(e) {
				def.reject({err: e.message});
			}

			// console.log(res);

			if(res.ended) {
				removeVPAID('ended');
			}

			checkTimes(res.currentTime, res.duration, options.skipTime);

			


		}, false);
		
		def.resolve(unit);

	});


	$iframe.on('error', function() {
		def.reject({err: 'Error load IFrame'});
		removeVPAID('error');
	});	

	return def.promise();
}

function vpaidPlayer(param) {
	contentWindow.postMessage(param, '*');
}

function removeVPAID(reason) {
	clearInterval(interval);
	$vpaidContainer.empty();

	switch(reason) {
		case 'ended':
			unit.emit('AdComplete');
			logw('AdComplete');
		break;

		case 'stop':
			unit.emit('AdStopped');
			logw('AdStopped');
		break;

		case 'error':
			unit.emit('AdError');
		break;

		case 'skip':
			unit.emit('AdSkipped');
			logw('AdSkipped');
		break;

		default:
			unit.emit('AdComplete');
		break;
	}
}

function checkTimes(currentTime, duration, skipTime) {
    var percenr = currentTime/duration*100;

    if ((percenr >= 25) && state.firstQuartile) {
        state.firstQuartile = false;
        unit.emit('AdFirstQuartile');
        logw('AdFirstQuartile');
    }

    if ((percenr >= 50) && state.midpoint) {
        state.midpoint = false;
        unit.emit('AdMidpoint');
        logw('AdMidpoint')
    }

    if ((percenr >= 75) && state.thirdQuartile) {
        state.thirdQuartile = false;
        unit.emit('AdThirdQuartile');
        logw('AdThirdQuartile');
    }

    $time.text(Math.floor(currentTime) + ' сек из ' + Math.floor(duration) + ' сек');

    if(currentTime >= skipTime && state.skipHidden && skipTime > 0) {
    	$skip.show();
    	state.skipHidden = false;
    }
}

// log one string
function logw(w) {
	console.log('%c'+w, 'color:green');
}

module.exports = VPAIDHTML5mixer;

/*

  'AdLoaded',
        'AdStarted',
        'AdStopped',
        'AdSkipped',
        'AdSkippableStateChange', // VPAID 2.0 new event
        'AdSizeChange', // VPAID 2.0 new event
        'AdLinearChange',
        'AdDurationChange', // VPAID 2.0 new event
        'AdExpandedChange',
        'AdRemainingTimeChange', // [Deprecated in 2.0] but will be still fired for backwards compatibility
        'AdVolumeChange',
        'AdImpression',
        'AdVideoStart',
        'AdVideoFirstQuartile',
        'AdVideoMidpoint',
        'AdVideoThirdQuartile',
        _'AdVideoComplete',
        'AdClickThru',
        'AdInteraction', // VPAID 2.0 new event
        'AdUserAcceptInvitation',
        'AdUserMinimize',
        'AdUserClose',
        'AdPaused',
        'AdPlaying',
        'AdLog',
        _'AdError'

*/