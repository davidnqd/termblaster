/**
 * Based off http://www.phpied.com/javascript-include/
 */
function termBlaster_include(script_filename) {
    var html_doc = document.getElementsByTagName('head').item(0);
    var js = document.createElement('script');
    js.setAttribute('language', 'javascript');
    js.setAttribute('type', 'text/javascript');
    js.setAttribute('src', script_filename);
    html_doc.appendChild(js);
}

/**
 * Print out a debug message
 */
function termBlaster_print(msg) {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
  if (prefs.getBoolPref("extensions.termblaster.debug")) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                           .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage(msg);
  }
}