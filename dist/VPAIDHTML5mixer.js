var VPAIDHTML5mixer =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Emitter = __webpack_require__(1);


	var unit, $iframe, $vpaidContainer, interval, state = {}, $skip, contentWindow ,$time, debug;

	function createFrame(url) {
		return $('<iframe/>', {src: url, style:'border: 0px !important; width: 100%; height: 100%;'});
	};

	function VPAIDHTML5mixer(url, player, vpaidContainer, options) {
		debug = options.debug || false; 
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

		$iframe.on('load', function() {
			
			contentWindow = $iframe.get(0).contentWindow;

			setTimeout(function() {
				unit.emit('AdCreativeView');
				unit.emit('AdImpression');
				unit.emit('AdStart');
			}, 0);

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

		$a.append($iframe);

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
		if(debug) console.log('%c'+w, 'color:green');
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

/***/ },
/* 1 */
/***/ function(module, exports) {

	
	/**
	 * Expose `Emitter`.
	 */

	module.exports = Emitter;

	/**
	 * Initialize a new `Emitter`.
	 *
	 * @api public
	 */

	function Emitter(obj) {
	  if (obj) return mixin(obj);
	};

	/**
	 * Mixin the emitter properties.
	 *
	 * @param {Object} obj
	 * @return {Object}
	 * @api private
	 */

	function mixin(obj) {
	  for (var key in Emitter.prototype) {
	    obj[key] = Emitter.prototype[key];
	  }
	  return obj;
	}

	/**
	 * Listen on the given `event` with `fn`.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.on =
	Emitter.prototype.addEventListener = function(event, fn){
	  this._callbacks = this._callbacks || {};
	  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
	    .push(fn);
	  return this;
	};

	/**
	 * Adds an `event` listener that will be invoked a single
	 * time then automatically removed.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.once = function(event, fn){
	  function on() {
	    this.off(event, on);
	    fn.apply(this, arguments);
	  }

	  on.fn = fn;
	  this.on(event, on);
	  return this;
	};

	/**
	 * Remove the given callback for `event` or all
	 * registered callbacks.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.off =
	Emitter.prototype.removeListener =
	Emitter.prototype.removeAllListeners =
	Emitter.prototype.removeEventListener = function(event, fn){
	  this._callbacks = this._callbacks || {};

	  // all
	  if (0 == arguments.length) {
	    this._callbacks = {};
	    return this;
	  }

	  // specific event
	  var callbacks = this._callbacks['$' + event];
	  if (!callbacks) return this;

	  // remove all handlers
	  if (1 == arguments.length) {
	    delete this._callbacks['$' + event];
	    return this;
	  }

	  // remove specific handler
	  var cb;
	  for (var i = 0; i < callbacks.length; i++) {
	    cb = callbacks[i];
	    if (cb === fn || cb.fn === fn) {
	      callbacks.splice(i, 1);
	      break;
	    }
	  }
	  return this;
	};

	/**
	 * Emit `event` with the given args.
	 *
	 * @param {String} event
	 * @param {Mixed} ...
	 * @return {Emitter}
	 */

	Emitter.prototype.emit = function(event){
	  this._callbacks = this._callbacks || {};
	  var args = [].slice.call(arguments, 1)
	    , callbacks = this._callbacks['$' + event];

	  if (callbacks) {
	    callbacks = callbacks.slice(0);
	    for (var i = 0, len = callbacks.length; i < len; ++i) {
	      callbacks[i].apply(this, args);
	    }
	  }

	  return this;
	};

	/**
	 * Return array of callbacks for `event`.
	 *
	 * @param {String} event
	 * @return {Array}
	 * @api public
	 */

	Emitter.prototype.listeners = function(event){
	  this._callbacks = this._callbacks || {};
	  return this._callbacks['$' + event] || [];
	};

	/**
	 * Check if this emitter has `event` handlers.
	 *
	 * @param {String} event
	 * @return {Boolean}
	 * @api public
	 */

	Emitter.prototype.hasListeners = function(event){
	  return !! this.listeners(event).length;
	};

/***/ }
/******/ ]);