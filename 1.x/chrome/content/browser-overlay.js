// ----------------------------------------------------------------------
// termBlaster - The context search extension
//  @copyright 2006 David Duong
//  @version $Id: browser-overlay.js,v 1.9 2006/06/07 06:22:24 davidnqd Exp $
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
var termBlaster_SearchWindow;

/**
 * Observer to update termBlaster when needed
 */
function termBlasterOptionsObserver()
{
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "TermBlasterOptions_reloadMenus", false);
}
termBlasterOptionsObserver.prototype = {
    observe: function(subject, topic, data) {
        TermBlaster.updateMenu(false);
    },

    unregister: function() {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(this, "TermBlasterOptions_reloadMenus");
  }
};

var TermBlaster = {
    onLoad: function() {
        window.addEventListener("unload", TermBlaster.onUnLoad, false);
        document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", TermBlaster.onPopup, false);

        TermBlaster.updateMenu(true);
        this.observer = new termBlasterOptionsObserver();
    },

    onUnLoad: function() {
        this.observer.unregister();
    },

    /**
    * Show options menu
    */
    onMenuItemCommand: function() {
        window.open("chrome://termblaster/content/options.xul", "termBlaster_settings", "chrome");
    },

    /**
    * Executes whenever the context menu is opened
    */
    onPopup: function(evt) {
        if (gContextMenu != null) {
            var node = document.popupNode;
            var textSelected = gContextMenu.isTextSelected;
            if (!textSelected && gContextMenu.isTargetATextBox(node)) {
                    textSelected = (node.selectionEnd - node.selectionStart) != 0;
            }

            var hideSeperator = true;
            var popup = document.getElementById("contentAreaContextMenu");
            node = popup.firstChild;
            // Set visibility
            while (node != null) {
                next = node.nextSibling;
                if (node.hasAttribute("termblaster-root")) {
                    if (node.getAttribute("termblaster-root") == "false" || node.firstChild.hasChildNodes()) {
                        node.hidden = !textSelected;
                        if (hideSeperator && textSelected) {
                            hideSeperator = false;
                        }
                    }
                }
                node = next;
            }
            document.getElementById("termblaster-separator").hidden = hideSeperator;
        }
    },

    /**
    * Update the xml file
    *
    * @params async
    */
    updateMenu: function (async) {
        this.clearMenu(document.getElementById("contentAreaContextMenu"));
        this.clearMenu(document.getElementById("termblaster-database-popup"));
        this.clearMenu(document.getElementById("termblaster-quicklist-popup"));
        try {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefBranch);
            var before = prefs.getBoolPref("extensions.termblaster.context.databaseFolder");
            TermBlasterPopulator.loadPopup('database', document.getElementById("termblaster-database-popup"), before);
            before = prefs.getBoolPref("extensions.termblaster.context.quicklistFolder");
            TermBlasterPopulator.loadPopup('quicklist', document.getElementById("termblaster-quicklist-popup"), before);
        } catch (e) {
            termBlaster_print("termBlaster could not create popup menus: " + e.message);
        }
    },

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
    },

    /**
    * Gets whatever text is selected
    */
    getSelection: function () {
        var node = document.popupNode;
        // Get Selected text
        var selection;
        if (gContextMenu.isTargetATextBox(node)) {
            selection = node.value.substring(node.selectionStart, node.selectionEnd);
        } else {
            selection = document.commandDispatcher.focusedWindow.getSelection();
        }
        return selection.toString().replace(/^[\s\"]+|[\s\"]+$/g,"");
    },

    /**
    * Searches the selected text, with the method set in the extension's options
    *
    * @params sQuery The query string of the selected search engine
    */
    search: function (sQuery, destination) {
        var selection = this.getSelection();

        if (selection.length >= 1) {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefBranch);
            var focus = prefs.getBoolPref("extensions.termblaster.focus");
            if (prefs.getBoolPref("extensions.termblaster.quote")) {
                selection = '"' + selection + '"';
            }

            sQuery = sQuery.replace('\$s', encodeURIComponent(selection));

            try {
                if (destination == null) {
                    destination = prefs.getIntPref("extensions.termblaster.destination");
                }
                switch (destination) {
                    // Use only a single window with a dirty little trick
                    case 0:
                        try {
                            var newTab = termBlaster_SearchWindow.addTab(sQuery);
                            if (focus) {
                                termBlaster_SearchWindow.getBrowser().selectedTab = newTab;
                            }
                        } catch (e) {
                            open(sQuery);
                            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                              .getService(Components.interfaces.nsIWindowMediator);
                            var newWindow = wm.getMostRecentWindow("navigator:browser");
                                termBlaster_SearchWindow = newWindow.getBrowser();
                        }
                    break;
                    // Open result in a new window
                    case 2: open(sQuery); break;
                    // Open results in current window
                    case 3: getBrowser().loadURI(sQuery); break;
                    // Open results in a new tab of current window
                    default:
                        var browser = getBrowser();
                        var newTab = browser.addTab(sQuery);
                        if (focus) {
                            browser.selectedTab = newTab;
                        }
                    break;
                }
            } catch (e) {
                termBlaster_print("termBlaster could not execute search: " + e.message);
            }
        }
    }
};

var TermBlasterPopulator = {
    XUL_NS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

    /**
    * Populate a menu with nodes from loaded XML file
    */
    loadPopup: function(key, popup, before) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
          .getService(Components.interfaces.nsIPrefBranch);
        var uri = prefs.getCharPref("extensions.termblaster.opened." + key).replace(/^\s*|\s*$/g, "");
        if (uri == "") {
            popup.parentNode.hidden = true;
            return;
        }

        // Executes after the XML file has been loaded
        var XMLDoc = document.implementation.createDocument("", "", null);
        XMLDoc.async = false;
        // Thanks to whu for the event listener suggestion
        XMLDoc.addEventListener("load", function () {
            TermBlasterPopulator.loadNode(XMLDoc.documentElement, popup, 0, before);
        }, false);

        // Load an XML file
        try {
            XMLDoc.load(uri);
        } catch (e) {
            termBlaster_print("termBlaster could not load selected file ('" + uri + "'): " + e.message);
        }
    },

    loadNode: function (iNode, popup, level, before) {
        if (before && level > 1) {
            before = false;
        }
        if (iNode != null && iNode.localName != null) {
            if (iNode.localName == 'service') {  // Process a leaf node
                this.addMenuItem(iNode, popup, before);
            } else {
                if (iNode.localName == 'folder') {  // Process a folder node
                    popup = this.addMenu(iNode, popup, before);
                }

                var nextlevel = level + 1;
                // Load all child nodes
                var cNode;
                for (var i = 0; i < iNode.childNodes.length; i++) {
                    cNode = iNode.childNodes[i];
                    if (cNode.localName != null) {
                        this.loadNode(cNode, popup, nextlevel, before);
                    }
                }

                if (!popup.parentNode.hidden && !popup.hasChildNodes()) {
                    if (popup.parentNode.getAttribute("termblaster-root") == "true") {
                        popup.parentNode.hidden = true;
                    } else {
                        popup.parentNode.parentNode.removeChild(popup.parentNode);
                    }
                } else if (popup.parentNode.hidden && popup.hasChildNodes()) {
                    popup.parentNode.hidden = false;
                }
            }
        }
    },

    addMenu: function(iNode, popup, before) {
        var menu = document.createElementNS(this.XUL_NS, "menu");
        menu.setAttribute("class", "menu-iconic termblaster-icon-folder");
        menu.setAttribute("label", iNode.getAttribute("name"));
        menu.setAttribute("termblaster-root", "false");
        var menupopup = document.createElementNS(this.XUL_NS, "menupopup");
        menu.appendChild(menupopup);
        if (before) {
            popup.parentNode.parentNode.insertBefore(menu, popup.parentNode);
        } else {
            popup.appendChild(menu);
        }

        return menupopup;
    },

    addMenuItem: function(iNode, popup, before) {
        var item = document.createElementNS(this.XUL_NS, "menuitem");
        item.setAttribute("class", "menuitem-iconic termblaster-icon-file");
        item.maxHeight = "16px";
        var favicon;
        if (iNode.hasAttribute("icon")) {
            favicon = iNode.getAttribute("icon");
        } else {
            favicon = iNode.getAttribute("query");
            var last = favicon.indexOf('/', favicon.indexOf('://') + 3);
            if (last >= 0) {
                favicon = favicon.substr(0, last) + "/favicon.ico";
            } else {
                favicon = 'chrome://termblaster/skin/file.png';
            }
        }
        item.setAttribute("style", "list-style-image: url('" + favicon + "');");
        item.setAttribute("label", iNode.getAttribute("name"));
        item.setAttribute("oncommand", "TermBlaster.search('" + iNode.getAttribute("query") + "');");
        item.setAttribute("termblaster-root", "false");
        if (before) {
            popup.parentNode.parentNode.insertBefore(item, popup.parentNode);
        } else {
            popup.appendChild(item);
        }

        return item;
    },

    onMenuClick: function(button, query) {
        if (button == 1) {
            TermBlaster.search(query, 1);
        }
    }
}
window.addEventListener("load", TermBlaster.onLoad, false);
