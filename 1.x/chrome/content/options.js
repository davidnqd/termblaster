// ----------------------------------------------------------------------
// termBlaster - The context search extension
//  @copyright 2006 David Duong
//  @version $Id: options.js,v 1.12 2006/06/07 06:22:24 davidnqd Exp $
// ----------------------------------------------------------------------
// LICENSE
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License (GPL)
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have recieved the lincence included with the disribution.
// If not visit http://www.gnu.org/copyleft/gpl.html
// ----------------------------------------------------------------------
var TermBlasterOptions = {
  /**
   * Load values into window
   */
  onLoad: function() {
    this.txtDatabaseLocation = document.getElementById("txtDatabaseLocation");
    this.txtQuickListLocation = document.getElementById("txtQuickListLocation");
    this.rgDestination = document.getElementById("rgDestination");
    this.cbQuote = document.getElementById("cbQuote");
    this.cbFocus = document.getElementById("cbFocus");
    this.cbDatabaseFolder = document.getElementById("cbDatabaseFolder");
    this.cbQuicklistFolder = document.getElementById("cbQuicklistFolder");

    this.populate(this.txtDatabaseLocation);
    this.populate(this.txtQuickListLocation);

   this.displayPrefs();
  },

  /**
   * Open a browse dialog
   *
   * @param txtField Textfield where the selected file will be displayed
   */
  btnBrowseCommand: function(txtField) {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    fp.init(window, "", nsIFilePicker.modeOpen);
    fp.appendFilter("termBlaster Files", "*.tbd; *.tbq");

    if (fp.show() == nsIFilePicker.returnOK && fp.fileURL.spec && fp.fileURL.spec.length > 0) {
      var thefile = fp.file;
      txtField.value = fp.fileURL.spec;
    }
  },

  reloadMenus: function() {
    Components.classes["@mozilla.org/observer-service;1"]
       .getService(Components.interfaces.nsIObserverService)
       .notifyObservers(null, "TermBlasterOptions_reloadMenus", null);
  },

  /**
   * Commit changes
   */
  btnOkCommand: function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefBranch);

    prefs.setCharPref("extensions.termblaster.opened.database", this.txtDatabaseLocation.value);
    prefs.setCharPref("extensions.termblaster.opened.quicklist", this.txtQuickListLocation.value);
    prefs.setIntPref("extensions.termblaster.destination", this.rgDestination.selectedIndex);
    prefs.setBoolPref("extensions.termblaster.quote", this.cbQuote.checked);
    prefs.setBoolPref("extensions.termblaster.focus", this.cbFocus.checked);
    prefs.setBoolPref("extensions.termblaster.context.databaseFolder", this.cbDatabaseFolder.checked);
    prefs.setBoolPref("extensions.termblaster.context.quicklistFolder", this.cbQuicklistFolder.checked);

    this.reloadMenus();
  },

  /**
   * Grab preferences and display them
   */
  displayPrefs: function() {
    try {
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefBranch);
      this.txtDatabaseLocation.value = prefs.getCharPref("extensions.termblaster.opened.database");
      this.txtQuickListLocation.value = prefs.getCharPref("extensions.termblaster.opened.quicklist");
      this.rgDestination.selectedIndex = prefs.getIntPref("extensions.termblaster.destination");
      this.cbQuote.checked = prefs.getBoolPref("extensions.termblaster.quote");
      this.cbFocus.checked = prefs.getBoolPref("extensions.termblaster.focus");
      this.cbDatabaseFolder.checked = prefs.getBoolPref("extensions.termblaster.context.databaseFolder");
      this.cbQuicklistFolder.checked = prefs.getBoolPref("extensions.termblaster.context.quicklistFolder");
    } catch (e) {
      termBlaster_print("termBlaster could not load preferences: " + e.message);
    }
  },

  /**
   * Reset changes
   */
  resetFields: function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                                getService(Components.interfaces.nsIPrefBranch);
    try {
      prefs.clearUserPref("extensions.termblaster.opened.database");
    } catch (e) {}
    try {
      prefs.clearUserPref("extensions.termblaster.opened.quicklist");
    } catch (e) {}
    try {
      prefs.clearUserPref("extensions.termblaster.destination");
    } catch (e) {}
    try {
      prefs.clearUserPref("extensions.termblaster.quote");
    } catch (e) {}
    try {
      prefs.clearUserPref("extensions.termblaster.focus");
    } catch (e) {}
    try {
      prefs.clearUserPref("extensions.termblaster.context.databaseFolder");
    } catch (e) {}
    try {
      prefs.clearUserPref("extensions.termblaster.context.quicklistFolder");
    } catch (e) {}

    this.reloadMenus();
    window.close();
  },

  /**
   * Dynamically generate files list
   *
   * @param menulist Menulist where the file list should be displayed
   */
  populate: function(menulist) {
    menulist.appendItem('chrome://termblaster/content/data/QuickList.tbq');
    menulist.appendItem('chrome://termblaster/content/data/Services.tbd');
  }
};
