// ----------------------------------------------------------------------
// termBlaster - The context search extension
//  @copyright 2006-2008 David Duong
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
/** Options View Controller */
var termBlasterOptions = {
    /** Window onLoad event handler */
    onLoad: function() {
        // Property fields
        this.txtDatabaseLocation = document.getElementById("txtDatabaseLocation");
        this.rgDestination = document.getElementById("rgDestination");
        this.cbQuote = document.getElementById("cbQuote");
        this.cbFocus = document.getElementById("cbFocus");
        this.cbQuicklistFolder = document.getElementById("cbQuicklistFolder");
        this.txtQuickTag = document.getElementById("txtQuickTag");
        this.loadFields();
    },

    /** Load user prefferences into input fields */
    loadFields: function() {
        // Load the properties into the fields
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefBranch);
        this.txtQuickTag.value = prefs.getCharPref("extensions.termblaster@forizon.com.places.quickTag");
        this.txtDatabaseLocation.value = prefs.getCharPref("extensions.termblaster@forizon.com.opened.database");
        this.txtDatabaseLocation.appendItem(this.txtDatabaseLocation.value);
        this.rgDestination.selectedIndex = prefs.getIntPref("extensions.termblaster@forizon.com.destination");
        this.cbQuote.checked = prefs.getBoolPref("extensions.termblaster@forizon.com.quote");
        this.cbFocus.checked = prefs.getBoolPref("extensions.termblaster@forizon.com.focus");
        this.cbQuicklistFolder.checked = prefs.getBoolPref("extensions.termblaster@forizon.com.context.quicklistFolder");
    },

    /** Commit changes */
    setFields: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);

        var old = prefs.getCharPref("extensions.termblaster@forizon.com.opened.database");
        prefs.setCharPref("extensions.termblaster@forizon.com.opened.database", this.txtDatabaseLocation.value.replace(/^\s*|\s*$/g, ""));
        if (old != this.txtDatabaseLocation.value) {
            this.reloadServiceList();
        }
        prefs.setCharPref("extensions.termblaster@forizon.com.places.quickTag", this.txtQuickTag.value);
        prefs.setIntPref("extensions.termblaster@forizon.com.destination", this.rgDestination.selectedIndex);
        prefs.setBoolPref("extensions.termblaster@forizon.com.quote", this.cbQuote.checked);
        prefs.setBoolPref("extensions.termblaster@forizon.com.focus", this.cbFocus.checked);
        prefs.setBoolPref("extensions.termblaster@forizon.com.context.quicklistFolder", this.cbQuicklistFolder.checked);
    },

    /** Reset changes */
    resetFields: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                                    getService(Components.interfaces.nsIPrefBranch);
        try {
            prefs.clearUserPref("extensions.termblaster@forizon.com.opened.database");
            this.reloadServiceList();   // Line not reacjed if there is no user-set preference
        } catch (e) {}  // Ignored
        try {
            prefs.clearUserPref("extensions.termblaster@forizon.com.places.quickTag");
        } catch (e) {}
        try {
            prefs.clearUserPref("extensions.termblaster@forizon.com.destination");
        } catch (e) {}
        try {
            prefs.clearUserPref("extensions.termblaster@forizon.com.quote");
        } catch (e) {}
        try {
            prefs.clearUserPref("extensions.termblaster@forizon.com.focus");
        } catch (e) {}
        try {
            prefs.clearUserPref("extensions.termblaster@forizon.com.context.quicklistFolder");
        } catch (e) {}

        this.loadFields();
    },

    /** Open a browse dialog */
    btnBrowseCommand: function() {
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                    .createInstance(Components.interfaces.nsIFilePicker);

        fp.init(window, "", Components.interfaces.nsIFilePicker.modeOpen);
        fp.appendFilter("termBlaster Files", "*.tbd; *.tbq");

        if (fp.show() == Components.interfaces.nsIFilePicker.returnOK
         && fp.fileURL.spec
         && fp.fileURL.spec.length > 0) {
            this.txtDatabaseLocation.value = fp.fileURL.spec;
        }
    },

    /** Open a browse dialog */
    btnExportCommand: function() {
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                    .createInstance(Components.interfaces.nsIFilePicker);

        fp.defaultExtension = ".tbd";
        fp.defaultString = "services.tbd";
        fp.init(window, "", Components.interfaces.nsIFilePicker.modeSave);
        fp.appendFilter("termBlaster Files (*.tbd)", "*.tbd");

        if (fp.show() == Components.interfaces.nsIFilePicker.returnOK
         && fp.fileURL.spec
         && fp.fileURL.spec.length > 0) {
            new TermBlaster_Exporter().export(fp.file);
        }
    },

    /** Notify browser overlay observer to reload service list */
    reloadServiceList: function() {
        Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .notifyObservers(null, "TermBlasterOptions_reloadServiceList", null);
    },

    /** Dynamically generate files list */
    populate: function(menulist) {
        menulist.appendItem("chrome://termblaster/content/data/services.tbd");
    }
};

/** Used by TermBlaster_Importer to import bookmark data */
function TermBlaster_Exporter() {
    // Usefull services
    this.ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
    this.tagsService
            = Components.classes["@mozilla.org/browser/tagging-service;1"]
              .getService(Components.interfaces.nsITaggingService);
    // "termBlaster" folder
    this.insert = null;
    this.xmlDocument = null;
    // User preference
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
    this.tag = prefs
             .getCharPref("extensions.termblaster@forizon.com.places.quickTag");
    this.folder = prefs
            .getIntPref("extensions.termblaster@forizon.com.places.folder");
}
TermBlaster_Exporter.prototype = {
    /** Exports to the given DOM Document */
    export: function (file) {
        this.xmlDocument = document.implementation.createDocument("", "", null);
        this.insert = this.xmlDocument.appendChild(this.xmlDocument.createElement("services"));

        // Query for all termBlaster bookmark items
        var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                                    .getService(Components.interfaces.nsINavHistoryService);
        var options = historyService.getNewQueryOptions();
        options.queryType = options.QUERY_TYPE_BOOKMARKS;
        options.sortingMode = options.SORT_BY_NONE;
        var query = historyService.getNewQuery();
        query.setFolders([this.folder], 1);
        var result = historyService.executeQuery(query, options);
        this.saveNode(result.root);
        this.serialize(file);
    },

    /* Parses the given DOM Node */
    saveNode: function (node) {
        if (node.type == node.RESULT_TYPE_FOLDER) {
            var parentFolder = this.insert;
            if (typeof node.containerOpen == 'undefined') {
                node = node.QueryInterface(
                        Components.interfaces.nsINavHistoryContainerResultNode);
                this.insert = this.addFolder(node);
            }
            var currentFolder = this.insert;
            node.containerOpen = true;
            for (var i = 0; i < node.childCount; i++) {
                try {
                    this.saveNode(node.getChild(i));
                } catch (e) {
                    Components.utils.reportError(e);
                }
                // Reset the insertion point that may have been changed
                // by the recursive call
                this.insert = currentFolder;
            }
            node.containerOpen = false;
            this.insert = parentFolder;
        } else if (node.type == node.RESULT_TYPE_URI) {
            this.addService(node);
        }
    },

    /** Add a bookmark with the information stored in a (<service>) node */
    addService: function (node) {
        var insert = this.insert
                        .appendChild(this.xmlDocument.createElement("service"));
        insert.setAttribute("name", node.title);
        insert.setAttribute("query", node.uri);
        var uri = this.ioService.newURI(node.uri, null, null);
        var tags = this.tagsService.getTagsForURI(uri, {});
        for (var i = 0; i < tags.length; i++) {
            if (tags[i] == this.tag) {
                insert.setAttribute("stared", "true");
            }
        }
    },

    /** Add a bookmark folder with the information stored in a <folder> node */
    addFolder: function (node) {
        insert = this.insert
                    .appendChild(this.xmlDocument.createElement("folder"));
        insert.setAttribute("name", node.title);
        return insert;
    },

    /** Serialize the XMLDocument to file */
    serialize: function (file) {
        var serializer = new XMLSerializer();
        var foStream =
            Components.classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);
        try {
            foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
            var string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
            foStream.write(string, string.length);
            serializer.serializeToStream(this.xmlDocument, foStream, "UTF-8");
        } finally {
            foStream.close();
        }
    }
}