// ----------------------------------------------------------------------
// termBlaster - The context search extension
//  @copyright 2006 David Duong
//  @version $Id: blaster.js,v 1.7 2006/06/07 06:22:24 davidnqd Exp $
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
 * Observer that updates the windows whenever the terms list is changed
 */
function termBlasterTermsObserver()
{
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "termBlaster-updateTerms", false);
}

termBlasterTermsObserver.prototype = {
    observe: function(subject, topic, data) {
        Blaster.updateTerms();
    },

    unregister: function() {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService);
        observerService.removeObserver(this, "termBlaster-updateTerms");
    }
};

/**
 * Blaster sidebar methods
 */
var Blaster = {
    load: function() {
        // Executes after the XML file has been loaded
        var XMLDoc = document.implementation.createDocument("", "", null);
        XMLDoc.async = false;
        XMLDoc.onload = function () {
            var iNode = XMLDoc.documentElement;
            var cNode;
            for (var i = 0; i < iNode.childNodes.length; i++) {
                cNode = iNode.childNodes.item(i);
                if (cNode != null
                  && cNode.localName != null
                  && cNode.localName == 'service') {
                lbSearch.appendItem(cNode.attributes.getNamedItem("name").nodeValue, cNode.attributes.getNamedItem("query").nodeValue);
                }
            }
        }

        // Loaded items will be stored here:
        var lbSearch = document.getElementById("services");

        // Load quicklist
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
        var uri = prefs.getCharPref("extensions.termblaster.opened.quicklist").replace(/^\s*|\s*$/g, "");
        try {
            XMLDoc.load(uri);
        } catch (e) {
            termBlaster_print("termBlaster could not load selected file ('" + uri + "'): " + e.message);
        }

        // Load termlist
        Blaster.updateTerms();
        try {
            this.observer = new termBlasterTermsObserver();
        } catch (e) {
            termBlaster_print("termBlaster could not load properly: " + e.message);
        }
  },

    unLoad: function() {
        try {
            this.observer.unregister();
        } catch (e) {
            termBlaster_print("termBlaster could not unload properly: " + e.message);
        }
    },

  onTermsKeyPress: function(event) {
        if (event.keyCode == event.DOM_VK_RETURN) { // Adding entries to the list
            var term = document.getElementById("search").value.replace(/^\s*|\s*$/g,"");
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
                var file = Components.classes["@mozilla.org/file/directory_service;1"]
                                .getService(Components.interfaces.nsIProperties)
                                .get("TmpD", Components.interfaces.nsIFile);
                file.append("termBlaster.tbt.tmp");

                // Append term
                var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                        .createInstance(Components.interfaces.nsIFileOutputStream);
                foStream.init(file, 0x02 | 0x08 | 0x10, 0664, 0);
                foStream.write(term + '\n', term.length + 1);
                foStream.close();

                // Tell everyone about it
                var observerService = Components.classes["@mozilla.org/observer-service;1"]
                    .getService(Components.interfaces.nsIObserverService);
                observerService.notifyObservers(Blaster,"termBlaster-updateTerms","addTerm");

                // Clear input box
                document.getElementById("search").value = '';
            }
        }
  },

  onTermsChangeSelection: function() {
        // Get the selected term
        // If none is selected, then the first is assumed
        if (document.getElementById("terms").selectedItem != null) {
            var term = document.getElementById("terms").selectedItem.value.replace(/^\s*|\s*$/g,"");
        } else if (document.getElementById("terms").getItemAtIndex(0) != null) {
            var term = document.getElementById("terms").getItemAtIndex(0).value.replace(/^\s*|\s*$/g,"");
        }

        // If term is defined, then return
        if (typeof(term) == "undefined") {
            return;
        }

        var query;
        // Get the query in a similiar fasion as the term
        if (document.getElementById("services").selectedItem != null) {
            query = document.getElementById("services").selectedItem.value.replace('\$s', encodeURIComponent(term));
        } else if (document.getElementById("services").getItemAtIndex(0) != null) {
            query = document.getElementById("services").getItemAtIndex(0).value.replace('\$s', encodeURIComponent(term));
        }

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

    clearTerms: function() {
        Blaster.getTermsTempFile().remove(false);
        // Tell everyone about it
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(Blaster,"termBlaster-updateTerms","clearTerms");
    },

    newTerms: function() {
        Blaster.setOpened('');
        Blaster.clearTerms();
    },

    /**
    * Prompt standard open dialog and open selected file
    */
    openTerms: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

        fp.init(window, "", nsIFilePicker.modeOpen);
        //fp.appendFilter("termBlaster Terms Files", "*.tbt");
        //fp.appendFilters(nsIFilePicker.filterText);
        fp.appendFilters(nsIFilePicker.filterAll);

        if (fp.show() == nsIFilePicker.returnOK
          && fp.fileURL.spec
          && fp.fileURL.spec.length > 0) {
            var file = fp.file;
            Blaster.setOpened(file.path);

            // Copy the input'd file to the term list file
            if (file.exists()) {
                var temp = Blaster.getTermsTempFile();
                if (temp.exists()) {
                    temp.remove(false);
                }
                file.copyTo(temp.parent,temp.leafName);
            }
            Blaster.setOpened(file.path);
            // Tell everyone about it
            var observerService = Components.classes["@mozilla.org/observer-service;1"]
              .getService(Components.interfaces.nsIObserverService);
            observerService.notifyObservers(Blaster,"termBlaster-updateTerms","openTerms");
        }
    },

    saveTerms: function() {
        var opened = Blaster.getOpenedPath();
        if (opened.length == 0) {
            Blaster.saveAsTerms();
            return;
        } else {
            var file_name = opened.replace(/^\s*|\s*$/g,"");
            try {
                var file = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsILocalFile);
                file.initWithPath(file_name);
            } catch (e) {
                termBlaster_print ("Could not open the terms file (" + file_name + ")");
                return;
            }

            // Copy the term list file to the input'd file
            try {
                var temp = Blaster.getTermsTempFile();
                if (file.exists()) {
                    file.remove(false);
                }
                temp.copyTo(file.parent,file.leafName);
            } catch (e) {
                termBlaster_print ("Could not save the terms file (" + file.path + "): " + e);
            }
            Blaster.setOpened(file.path);
        }
    },

    /**
    * Prompt standard save as input and save to selected file, create if necessary
    */
    saveAsTerms: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

        fp.init(window, "", nsIFilePicker.modeSave);
        //fp.appendFilter("termBlaster Terms Files", "*.tbt");
        //fp.appendFilters(nsIFilePicker.filterText);
        fp.appendFilters(nsIFilePicker.filterAll);

        var dialog = fp.show();

        if (dialog == nsIFilePicker.returnOK
          || dialog == nsIFilePicker.returnReplace) {
            Blaster.setOpened(fp.file.path);
            Blaster.saveTerms();
        }
    },

    /**
    * Get term list's temporary file
    *
    * @return nsiFile
    */
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

    /**
    * Get opened filename from mozilla preferences
    *
    * @return filename of the opened termlist
    */
    getOpenedPath: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
        return prefs.getCharPref("extensions.termblaster.opened.terms");
    },

    /**
    * Set opened filename to mozilla preferences
    */
    setOpened: function(filename) {
        if (typeof filename == 'string') {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefBranch);
            prefs.setCharPref("extensions.termblaster.opened.terms", filename);
        } else {
            termBlaster_print("Invalid Argument");
        }
    },

    /**
    * Add term
    */
    add: function(term) {
        term = term.replace(/^\s*|\s*$/g,"");
        var terms = document.getElementById("terms");
        if (term.length > 0) {
            document.getElementById("terms").appendItem(term, term);
        }
    },

    updateTerms: function () {
        var terms = document.getElementById('terms');

        // Get rid of whatever was loaded before
        var rowCount = terms.getRowCount();
        for(var i = 0; i < rowCount; i++) {
            terms.removeItemAt(0);
        }

        var file = Blaster.getTermsTempFile();
        if (file.exists()) {
            // open an input stream from file
            var fiStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
            .createInstance(Components.interfaces.nsIFileInputStream);
            try {
                fiStream.init(file, 0x01, 0444, 0);
                fiStream.QueryInterface(Components.interfaces.nsILineInputStream);

                // add lines into Blaster
                var line = {}, lines = [], cont;
                do {
                    cont = fiStream.readLine(line);
                    Blaster.add(line.value);
                } while(cont);
            } catch (e) {
                termBlaster_print ("Could not read the terms file (" + file.path + "): " + e);
            } finally {
                fiStream.close();
            }
        }
    }
}
