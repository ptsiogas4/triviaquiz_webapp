(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/i.test(ua) || (/Macintosh|MacIntel/i.test(ua) && navigator.maxTouchPoints > 1);
  document.getElementById('android-store').hidden = ios || !/Android/i.test(ua);
  document.getElementById('ios-install').hidden = !ios;
})();
