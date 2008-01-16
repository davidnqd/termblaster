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

/**
 * This observer is used to keep the Blaster's Terms List up to date.
 *
 * When modifying the terms list, these changes must be reflected in all open
 * Blaster windows.
 */
function TermBlaster_TermsObserver() {}
TermBlaster_TermsObserver.prototype = {
    register: function () {
        Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService)
        .addObserver(this, "termBlaster-updateTerms", false);
    },

    observe: function(subject, topic, data) {
        termBlaster_Blaster.updateTerms();
    },

    unregister: function() {
        Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService)
          .removeObserver(this, "termBlaster-updateTerms");
    }
};

/** Blaster sidebar controller */
var termBlaster_Blaster = {
    /** Onload event handler */
    onLoad: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
        document.getElementById("database-popup")
          .setAttribute("place", "place:folder="
          + prefs.getIntPref("extensions.termblaster@forizon.com.places.folder")
          + "&amp;expandQueries=1");
        this.observer = new TermBlaster_TermsObserver();
        this.observer.register();
        // Executes after the XML file has been loaded
        this.quickListPopulator = new TermBlaster_QuickListPopulator();
        this.quickListPopulator.populate();
        // Load termlist
        termBlaster_Blaster.updateTerms();
    },

    /** Unregisters any observers */
    onUnLoad: function() {
        this.observer.unregister();
    },

    /**
     * Terms list keypress event handler
     *
     * Adds term to all terms listbox (even to terms list in other windows) when
     * the enter key is pressed.
     */
    onTermsKeyPress: function(event) {
        if (event.keyCode == event.DOM_VK_RETURN) {
            var term = document.getElementById("search")
                        .value.replace(/^\s*|\s*$/g,"");
            var node = document.getElementById("terms").firstChild;
            var match = false;
            // Check for duplicate term
            while (node != null && !match) {
                match = node.value.toUpperCase() == term.toUpperCase();
                if (match) { // Highlight term if it has already been added
                    node.selected = true;
                }
                node = node.nextSibling;
            }
            if (!match) {
                // Get temporary file
                var file = Components
                            .classes["@mozilla.org/file/directory_service;1"]
                            .getService(Components.interfaces.nsIProperties)
                            .get("TmpD", Components.interfaces.nsIFile);
                file.append("termBlaster.tbt.tmp");

                // Append term
                var foStream = Components
                           .classes["@mozilla.org/network/file-output-stream;1"]
                           .createInstance(
                                Components.interfaces.nsIFileOutputStream);
                foStream.init(file, 0x02 | 0x08 | 0x10, 0664, 0);
                foStream.write(term + '\n', term.length + 1);
                foStream.close();

                // Tell everyone about it
                var observerService = Components
                          .classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
                observerService.notifyObservers(termBlaster_Blaster,
                                                "termBlaster-updateTerms",
                                                "addTerm");

                // Clear input box
                document.getElementById("search").value = '';
            }
        }
    },

    /** Perform search using the selected Quick List service */
    doSearch: function(event) {
        // Get the query in a similiar fasion as the term
        var services = document.getElementById("services");
        if (services.selectedItem != null) {
            this.search(services.selectedItem.value);
        } else if (services.getItemAtIndex(0) != null) {
            this.search(services.getItemAtIndex(0).value);
        }
    },

    /** Perform search using the selected service from popup menu */
    doSearchWithEvent: function(event) {
        var target = event.originalTarget;
        if (target.node) {
            document.getElementById("services").selectedItem
                = this.quickListPopulator.addNode(target.node);
        }
    },

    /** Clear terms list */
    doClearTerms: function() {
        termBlaster_Blaster.getTermsTempFile().remove(false);
        // Tell everyone about it
        var observerService = Components
                          .classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(termBlaster_Blaster,
                                        "termBlaster-updateTerms",
                                        "clearTerms");
    },

    /** Reset terms list */
    doNewTerms: function() {
        termBlaster_Blaster.setOpened('');
        termBlaster_Blaster.doClearTerms();
    },

    /** Prompt standard open dialog and open selected file */
    doOpenTerms: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                             .createInstance(nsIFilePicker);

        fp.init(window, "", nsIFilePicker.modeOpen);
        //fp.appendFilter("termBlaster Terms Files", "*.tbt");
        //fp.appendFilters(nsIFilePicker.filterText);
        fp.appendFilters(nsIFilePicker.filterAll);

        if (fp.show() == nsIFilePicker.returnOK
          && fp.fileURL.spec
          && fp.fileURL.spec.length > 0) {
            var file = fp.file;
            termBlaster_Blaster.setOpened(file.path);

            // Copy the input'd file to the term list file
            if (file.exists()) {
                var temp = termBlaster_Blaster.getTermsTempFile();
                if (temp.exists()) {
                    temp.remove(false);
                }
                file.copyTo(temp.parent,temp.leafName);
            }
            termBlaster_Blaster.setOpened(file.path);
            // Tell everyone about it
            var observerService = Components
                          .classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
            observerService.notifyObservers(termBlaster_Blaster,
                                            "termBlaster-updateTerms",
                                            "openTerms");
        }
    },

    /** Save terms to the selected file */
    doSaveTerms: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
        var opened = prefs.getCharPref("extensions.termblaster.opened.terms");
        if (opened.length == 0) {
            termBlaster_Blaster.doSaveAsTerms();
            return;
        } else {
            var file_name = opened.replace(/^\s*|\s*$/g,"");
            var file = Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(file_name);
            // Copy the term list file to the input'd file
            var temp = termBlaster_Blaster.getTermsTempFile();
            if (file.exists()) {
                file.remove(false);
            }
            temp.copyTo(file.parent,file.leafName);
            termBlaster_Blaster.setOpened(file.path);
        }
    },

    /** Prompt standard save as input and save to selected file */
    doSaveAsTerms: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                                .createInstance(nsIFilePicker);

        fp.init(window, "", nsIFilePicker.modeSave);
        //fp.appendFilter("termBlaster Terms Files", "*.tbt");
        //fp.appendFilters(nsIFilePicker.filterText);
        fp.appendFilters(nsIFilePicker.filterAll);

        var dialog = fp.show();

        if (dialog == nsIFilePicker.returnOK
          || dialog == nsIFilePicker.returnReplace) {
            termBlaster_Blaster.setOpened(fp.file.path);
            termBlaster_Blaster.doSaveTerms();
        }
    },

    /** Perform search using the specified query URL */
    search: function(query) {
        // Get the selected term
        // If none is selected, then the first is assumed
        var terms = document.getElementById("terms");
        if (terms.selectedItem != null) {
            var term = terms.selectedItem.value.replace(/^\s*|\s*$/g,"");
        } else if (terms.getItemAtIndex(0) != null) {
            var term = terms.getItemAtIndex(0).value.replace(/^\s*|\s*$/g,"");
        }

        // If term is defined, then return
        if (typeof(term) == "undefined") {
            return;
        }

        query = query.replace('\$s',
            encodeURIComponent(term).replace('\%20', '+'));
        // If query is empty then return
        if (typeof(query) == "undefined" && query.length == 0) {
            return;
        }

        // Load the results in the current window
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
          .getService(Components.interfaces.nsIWindowMediator);
        var win = wm.getMostRecentWindow("navigator:browser");
        win.getBrowser().loadURI(query);
    },

    /** Get term list's temporary file */
    getTermsTempFile: function() {
        var file = Components.classes["@mozilla.org/file/directory_service;1"]
          .getService(Components.interfaces.nsIProperties)
          .get("TmpD", Components.interfaces.nsIFile);
        file.append("termBlaster.tbt.tmp");
        if (!file.exists()) {
            file.create(file.NORMAL_FILE_TYPE, 0644);
        }
        return file;
    },

    /** Set opened filename to mozilla preferences */
    setOpened: function(filename) {
        if (typeof filename == 'string') {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefBranch);
            prefs.setCharPref("extensions.termblaster.opened.terms", filename);
        } else {
            Components.utils.reportError("Invalid Argument");
        }
    },

    /** Refresh the terms list with whatever is stored in the terms file */
    updateTerms: function () {
        var terms = document.getElementById('terms');

        // Get rid of whatever was loaded before
        var rowCount = terms.getRowCount();
        for(var i = 0; i < rowCount; i++) {
            terms.removeItemAt(0);
        }

        var file = termBlaster_Blaster.getTermsTempFile();
        if (file.exists()) {
            // open an input stream from file
            try {
                var fiStream = Components
                      .classes["@mozilla.org/network/file-input-stream;1"]
                      .createInstance(Components.interfaces.nsIFileInputStream);
            } catch (e) {
                Components.utils.reportError(e);
                return;
            }

            try {
                fiStream.init(file, 0x01, 0444, 0);
                fiStream.QueryInterface(
                    Components.interfaces.nsILineInputStream);

                // add lines into termBlaster_Blaster
                var line = {}, lines = [], cont;
                do {
                    cont = fiStream.readLine(line);
                    var term = line.value.replace(/^\s*|\s*$/g,"");
                    var terms = document.getElementById("terms");
                    if (term.length > 0) {
                        document.getElementById("terms").appendItem(term, term);
                    }
                } while(cont);
            } finally {
                fiStream.close();
            }
        }
    }
}

/**
 * Populates the quicklist with items tagged with the user's preffered
 * termblaster quick tag
 */
function TermBlaster_QuickListPopulator() {
    // Usefull services
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
    this.tagsService =
            Components.classes["@mozilla.org/browser/tagging-service;1"]
            .getService(Components.interfaces.nsITaggingService);
    this.faviconService =
            Components.classes["@mozilla.org/browser/favicon-service;1"]
            .getService(Components.interfaces.nsIFaviconService);
    this.ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
    this.historyService =
        Components.classes["@mozilla.org/browser/nav-history-service;1"]
        .getService(Components.interfaces.nsINavHistoryService);
    this.lbSearch = document.getElementById("services");
}
TermBlaster_QuickListPopulator.prototype = {
    XUL_NS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    /** Fetches all tagged URIs and adds them to the context menu */
    populate: function() {
        this.clear();
        // Get all tagged items
        var tag = this.prefs
             .getCharPref("extensions.termblaster@forizon.com.places.quickTag");
        var tagURIs = this.tagsService.getURIsForTag(tag);
        if (tagURIs.length == 0 || this.insertOutside) {
            this.popupMenu.parentNode.setAttribute("termblaster-root",
                                                   "ignore");
            this.popupMenu.parentNode.hidden = true;
        }

        // Query for information on the tagged bookmark items
        var options = this.historyService.getNewQueryOptions();
        options.queryType = options.QUERY_TYPE_BOOKMARKS;
        options.sortingMode = options.SORT_BY_DATEADDED_ASCENDING;
        var queries = [];
        var folder = this.prefs
                .getIntPref("extensions.termblaster@forizon.com.places.folder");
        for (var i = 0; i < tagURIs.length; i++) {
            queries[i] = this.historyService.getNewQuery();
            queries[i].setFolders([folder], 1);
            queries[i].uri = tagURIs[i];
        }
        var result = this.historyService.executeQueries(queries, queries.length,
                                                        options);
        // Add each node
        result.root.containerOpen = true;
        var count = result.root.childCount;
        var node;
        for (var i = 0; i < count; i++) {
            node = result.root.getChild(i);
            if (node.type == node.RESULT_TYPE_URI) {
                this.addNode(node);
            }
        }
        result.root.containerOpen = false;
    },

    addNode: function(node) {
        var item = document.createElementNS(this.XUL_NS, "listitem");
        if (node.icon == null) {
            var iconURI = this.ioService.newURI(node.uri, null, null);
            item.setAttribute("image", this.faviconService
                                         .getFaviconLinkForIcon(iconURI).spec);
        } else {
            item.setAttribute("image", node.icon.spec);
        }
        item.setAttribute("label", node.title);
        item.setAttribute("value", node.uri);
        item.setAttribute("class", "listitem-iconic");
        return this.lbSearch.appendChild(item);
    },

    /** Clear all quick list items */
    clear: function () {
        var lbSearch = document.getElementById("services");
        var child = lbSearch.firstChild;
        var nextChild;
        while (child != null) {
            nextChild = child.nextSibling;
            lbSearch.removeChild(child);
            child = nextChild;
        }
    }
}