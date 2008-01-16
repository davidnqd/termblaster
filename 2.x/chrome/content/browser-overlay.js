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
/** Observer to update termBlaster when needed */
function TermBlaster_OptionsObserver(placesManager) {
    this.placesManager = placesManager;
}
TermBlaster_OptionsObserver.prototype = {
    register: function() {
        Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .addObserver(this, "TermBlasterOptions_reloadServiceList", false);
    },

    observe: function(subject, topic, data) {
        // Repopulate the termBlaster folder
        try {
            this.placesManager.populate();
        } catch (e) {
            Components.utils.reportError(e);
        }

    },

    unregister: function() {
        Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService)
          .removeObserver(this, "TermBlasterOptions_reloadMenus");
    }
};

/**
 * Listens to the context menu popup and hides termBlaster menu items if no text
 * has been selected
 */
function TermBlaster_ContextMenuEventListener() {
    this.hide = false;
}
TermBlaster_ContextMenuEventListener.prototype = {
    /** Registers the listener */
    register: function () {
        document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", this.onPopupShowing, false);
    },

    /**
     * Hides termblaster menu items if there is no text selected
     */
    onPopupShowing: function(evt) {
        var oldHide = this.hide;
        this.hide = true;
        // gContextMenu stores stores information about the context menu
        // it is used to determine if the context menu was popup'ed on
        // selected text
        // We need to make sure that text has been selected, and that it is not
        // contained in a password field
        if (gContextMenu != null && gContextMenu.target != null
                                 && gContextMenu.target.type != "password") {
            // Determine if text was selected using two methods depending
            // on whether or not the text was contained in a text box
            this.hide = (gContextMenu.isTargetATextBox(document.popupNode))
                        ? document.popupNode.selectionEnd
                            == document.popupNode.selectionStart
                        : !gContextMenu.isTextSelected;
        }
        // If the hide variable has changed, change the visibility of
        // termblaster menu items
        if (oldHide != this.hide) {
            var node = document.getElementById("contentAreaContextMenu")
                        .firstChild;
            // Set visibility of termBlaster menu items
            while (node != null) {
                if (node.hasAttribute("termblaster-root")
                 && node.getAttribute("termblaster-root") != "ignore") {
                    node.hidden = this.hide;
                }
                node = node.nextSibling;
            }
            document.getElementById("termblaster-separator").hidden = this.hide;
        }
    }
}

/**
 * Ensures that the termblaster folder/container within the Places API exists
 * and is populated. Also stores the folder's ID.
 */
function TermBlaster_PlacesManager() {
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
    this.folder = this.prefs
                .getIntPref("extensions.termblaster@forizon.com.places.folder");
    this.bookmarksService =
            Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
            .getService(Components.interfaces.nsINavBookmarksService);
    this.quickListPopulator = new TermBlaster_QuickListPopulator(this);
    if (!this.folderExists()) {
        // Create and populate the Places folder if it does not exist
        this.createFolder();
        this.import();
    } else {
        this.populateServicesMenu();
        this.quickListPopulator.populate();
    }
}
TermBlaster_PlacesManager.prototype = {
    /** Determine if termBlaster's Places folder exists */
    folderExists: function() {
        // TODO: improve this check
        return this.folder != -1 && this.bookmarksService.getChildFolder(
              this.bookmarksService.unfiledBookmarksFolder, "termBlaster") != 0;
    },
    /** (Re)Populates the termBlaster folder */
    populate: function() {
        if (this.folderExists()) {
            this.clearFolder();
        } else {
            this.createFolder();
        }
        this.import();
    },
    /** Update's the place URI for the services menu */
    populateServicesMenu: function() {
        document.getElementById("termblaster-database-popup")
            .setAttribute("place", "place:folder="
                                    + this.folder
                                    + "&amp;expandQueries=1");
    },
    /** Create the termBlaster folder and remember the folder's ID */
    createFolder: function() {
        this.folder = this.bookmarksService.createFolder(
                        this.bookmarksService.unfiledBookmarksFolder,
                        "termBlaster",
                        this.bookmarksService.DEFAULT_INDEX);
        this.prefs.setIntPref(
               "extensions.termblaster@forizon.com.places.folder", this.folder);
        this.populateServicesMenu();
        return this.folder;
    },
    /** Get the folder's ID */
    getFolder: function() {
        return this.folder;
    },
    /** Clears the Places Folder */
    clearFolder: function() {
        this.bookmarksService.removeFolderChildren(this.folder);
    },
    /** Imports service list into Places Folder */
    import: function() {
        var uri = this.prefs
          .getCharPref("extensions.termblaster@forizon.com.opened.database");
        if (uri == "") {
            return;
        }

        var folder = this.folder;
        var quickListPopulator = this.quickListPopulator;
        // Executes after the XML file has been loaded
        var XMLDoc = document.implementation.createDocument("", "", null);
        XMLDoc.load(uri);
        // Thanks to whu for the event listener suggestion
        XMLDoc.addEventListener("load", function() {
            try {
                new TermBlaster_Importer(folder).load(XMLDoc);
                quickListPopulator.populate();
            } catch (e) {
                Components.utils.reportError(e);
            }
        }, false);

        // Load an XML file
        XMLDoc.load(uri);
    }
}

/** Used by TermBlaster_Importer to import bookmark data */
function TermBlaster_Importer(folder) {
    this.folder = folder; // Item insertion point
    // Usefull services
    this.bookmarksService
            = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
              .getService(Components.interfaces.nsINavBookmarksService);
    this.ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
    this.tagsService
            = Components.classes["@mozilla.org/browser/tagging-service;1"]
              .getService(Components.interfaces.nsITaggingService);
    this.faviconService
            = Components.classes["@mozilla.org/browser/favicon-service;1"]
              .getService(Components.interfaces.nsIFaviconService);
    // Tag used to mark quick list items
    this.tag = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch).getCharPref
                        ("extensions.termblaster@forizon.com.places.quickTag");
}
TermBlaster_Importer.prototype = {
    /** Parses the given DOM Document */
    load: function (xmlDocument) {
        this.loadNode(xmlDocument.documentElement);
    },

    /* Parses the given DOM Node */
    loadNode: function (node) {
        if (node != null && node.localName != null) {
            if (node.localName == 'service') {  // Process a leaf node
                this.addService(node);
            } else {
                // Remember the previous insertion point
                // - used after all children have been loaded
                var parentFolder = this.folder;
                if (node.localName == 'folder') {  // Process a folder node
                    this.folder = this.addFolder(node);
                    if (this.folder == null) {
                        this.folder = parentFolder;
                        return;
                    }
                }
                // Remember the current insertion point
                // - used after each child has been loaded
                var currentFolder = this.folder;

                for (var i = 0; i < node.childNodes.length; i++) {
                    if (node.childNodes[i].localName != null) {
                        this.loadNode(node.childNodes[i]);
                        // Reset the insertion point that may have been changed
                        // by the recursive call
                        this.folder = currentFolder;
                    }
                }
                this.folder = parentFolder; // Reset the insertion point
            }
        }
    },

    /** Add a bookmark with the information stored in a (<service>) node */
    addService: function (node) {
        var queryURI = this.ioService.newURI(
                        node.getAttribute("query"), null, null);
        this.bookmarksService.insertBookmark(this.folder,
                                        queryURI,
                                        this.bookmarksService.DEFAULT_INDEX,
                                        node.getAttribute("name"));
        // Tag quicklist
        if (node.hasAttribute("stared")
            && node.getAttribute("stared") == "true") {
            this.tagsService.tagURI(queryURI, [this.tag], 1);
        }
        // Load the favicon
        var favicon = (node.hasAttribute("icon"))
                        ? node.getAttribute("icon")
                        : queryURI.prePath + "/favicon.ico";
        this.faviconService.setAndLoadFaviconForPage(queryURI,
            this.ioService.newURI(favicon, null, null),
            false);
    },

    /** Add a bookmark folder with the information stored in a <folder> node */
    addFolder: function (node) {
        return this.bookmarksService.createFolder(this.folder,
                node.getAttribute("name"),
                this.bookmarksService.DEFAULT_INDEX);
    }
}

/**
 * Populates the quicklist menu with items tagged "termblaster quicklist"
 */
function TermBlaster_QuickListPopulator(places) {
    this.places = places;
    this.tagsService =
        Components.classes["@mozilla.org/browser/tagging-service;1"]
        .getService(Components.interfaces.nsITaggingService);
    this.faviconService =
        Components.classes["@mozilla.org/browser/favicon-service;1"]
        .getService(Components.interfaces.nsIFaviconService);
    this.historyService =
        Components.classes["@mozilla.org/browser/nav-history-service;1"]
        .getService(Components.interfaces.nsINavHistoryService);
    this.ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
    // The popup menu to insert the menu items in
    this.popupMenu = document.getElementById("termblaster-quicklist-popup");
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    // Tag used to mark quick list items
    this.tag = prefs.getCharPref
                 ("extensions.termblaster@forizon.com.places.quickTag");
    this.insertOutside = prefs.getBoolPref
                 ("extensions.termblaster@forizon.com.context.quicklistFolder");
}
TermBlaster_QuickListPopulator.prototype = {
    XUL_NS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

    /** Fetches all tagged URIs and adds them to the context menu */
    populate: function() {
        this.clear();
        // Get all tagged items
        var tagURIs = this.tagsService.getURIsForTag(this.tag);
        if (tagURIs.length == 0 || this.insertOutside) {
            this.popupMenu.parentNode.setAttribute("termblaster-root",
                                                   "ignore");
            this.popupMenu.parentNode.hidden = true;
        }
        if (tagURIs.length > 0) {
            // Query for information on the tagged bookmark items
            var options = this.historyService.getNewQueryOptions();
            options.queryType = options.QUERY_TYPE_BOOKMARKS;
            options.sortingMode = options.SORT_BY_DATEADDED_ASCENDING;
            var queries = [];
            var folder = this.places.getFolder();
            for (var i = 0; i < tagURIs.length; i++) {
                queries[i] = this.historyService.getNewQuery();
                queries[i].setFolders([folder], 1);
                queries[i].uri = tagURIs[i];
            }
            var result = this.historyService.executeQueries(queries,
                                                              queries.length,
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
        }
    },

    /** Adds the given URI to the quicklist (sub)menu */
    addNode: function(node) {
        var item = document.createElementNS(this.XUL_NS, "menuitem");
        item.setAttribute("class", "menuitem-iconic termblaster-icon-file");
        if (node.icon == null) {
            var iconURI = this.ioService.newURI(node.uri, null, null);
            item.setAttribute("image", this.faviconService
                                         .getFaviconLinkForIcon(iconURI).spec);
        } else {
            item.setAttribute("image", node.icon.spec);
        }
        item.setAttribute("label", node.title);
        item.setAttribute("termblaster-root", "false");
        if (this.insertOutside) {
            item = this.popupMenu.parentNode.parentNode
                     .insertBefore(item, this.popupMenu.parentNode);
            item.setAttribute("oncommand",
                                "termBlaster.searchWithEvent(event);");
        } else {
            item = this.popupMenu.appendChild(item);
        }
        item.node = node;
    },

    /** Clear all quick list items */
    clear: function () {
        this.popupMenu.parentNode.setAttribute("termblaster-root", "true");
        this.popupMenu.parentNode.hidden = false;
        this.clearMenu(this.popupMenu);
        this.clearMenu(this.popupMenu.parentNode.parentNode);
    },

    /** Clear all quick list items in a single popup */
    clearMenu: function (popup) {
        node = popup.firstChild;
        // Remove current nodes
        while (node != null) {
            next = node.nextSibling;
            if (node.getAttribute("termblaster-root") == "false") {
                popup.removeChild(node);
            }
            node = next;
        }
    }
}

/** Overlay controller */
var termBlaster = {
    /** On browser window open event handler */
    onLoad: function() {
        try {
            this.placesManager = new TermBlaster_PlacesManager();
            this.optionsObserver =
                new TermBlaster_OptionsObserver(this.placesManager);
            this.optionsObserver.register();
        } catch (e) {
            Components.utils.reportError(e);
            return;
        }
        try {
            new TermBlaster_ContextMenuEventListener().register();
            window.addEventListener("unload", function() {
                termBlaster.onUnload();
            }, false);
        } catch (e) {
            this.optionsObserver.unregister();
            Components.utils.reportError(e);
        }
    },

    /** On browser window close event handler */
    onUnload: function() {
        try {
            this.optionsObserver.unregister();
        } catch (e) {
            Components.utils.reportError(e);
        }
    },

    /** Search with information taken from an event */
    searchWithEvent: function(aEvent) {
        var target = aEvent.originalTarget;
        if (target.node) {
            try {
                this.search(target.node.uri);
            } catch (e) {
                Components.utils.reportError(e);
            }
        }
    },

    /** Gets whatever text is selected */
    getSelection: function () {
        var node = document.popupNode;
        // Get Selected text
        var selection = (gContextMenu.isTargetATextBox(node))
          ? node.value.substring(node.selectionStart, node.selectionEnd)
          : document.commandDispatcher.focusedWindow.getSelection();
        return selection.toString().replace(/^[\s\"]+|[\s\"]+$/g,"")  // Trim
                                   .replace('\s+', ' ');  // Replace whitespace
    },

    /**
    * Searches the selected text, with the method set in the extension's options
    *
    * @params sQuery The query string of the selected search engine
    */
    search: function (sQuery) {
        var selection = this.getSelection();

        // If nothing is selected, do nothing
        if (selection.length == 0) {
            return;
        }

        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
        // Add quotes to the search query, if preffered by the user
        if (prefs.getBoolPref("extensions.termblaster@forizon.com.quote")) {
            selection = '"' + selection + '"';
        }

        // Prepare the search query for a GET request
        sQuery = sQuery.replace('\$s',
                            encodeURIComponent(selection).replace('\%20', '+'));

        // Display the results in the user's preffered destination target
        var destination = prefs
                  .getIntPref("extensions.termblaster@forizon.com.destination");
        switch (destination) {
            // Open results in a single window
            case 0:
                try {
                    var newTab = this.searchWindow.addTab(sQuery);
                    if (prefs.getBoolPref
                            ("extensions.termblaster@forizon.com.focus")) {
                        this.searchWindow.selectedTab = newTab;
                    }
                } catch (e) {   // TODO: find an atomic solution
                    open(sQuery);
                    this.searchWindow = Components
                             .classes["@mozilla.org/appshell/window-mediator;1"]
                        .getService(Components.interfaces.nsIWindowMediator)
                        .getMostRecentWindow("navigator:browser");
                }
            break;
            // Open results in a new window
            case 2: open(sQuery); break;
            // Open results in current window
            case 3: getBrowser().loadURI(sQuery); break;
            // Open results in a new tab of current window
            default:
                var browser = getBrowser();
                var newTab = browser.addTab(sQuery);
                if (prefs.getBoolPref
                            ("extensions.termblaster@forizon.com.focus")) {
                    browser.selectedTab = newTab;
                }
            break;
        }
    }
}

window.addEventListener("load", function() {termBlaster.onLoad()}, false);
