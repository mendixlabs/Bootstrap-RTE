/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
 */

import jQ from 'jquery';

($ => {
    const jQuery = $;

    jQuery.hotkeys = {
        version: "0.2.0",

        specialKeys: {
            8: "backspace",
            9: "tab",
            10: "return",
            13: "return",
            16: "shift",
            17: "ctrl",
            18: "alt",
            19: "pause",
            20: "capslock",
            27: "esc",
            32: "space",
            33: "pageup",
            34: "pagedown",
            35: "end",
            36: "home",
            37: "left",
            38: "up",
            39: "right",
            40: "down",
            45: "insert",
            46: "del",
            59: ";",
            61: "=",
            96: "0",
            97: "1",
            98: "2",
            99: "3",
            100: "4",
            101: "5",
            102: "6",
            103: "7",
            104: "8",
            105: "9",
            106: "*",
            107: "+",
            109: "-",
            110: ".",
            111: "/",
            112: "f1",
            113: "f2",
            114: "f3",
            115: "f4",
            116: "f5",
            117: "f6",
            118: "f7",
            119: "f8",
            120: "f9",
            121: "f10",
            122: "f11",
            123: "f12",
            144: "numlock",
            145: "scroll",
            173: "-",
            186: ";",
            187: "=",
            188: ",",
            189: "-",
            190: ".",
            191: "/",
            192: "`",
            219: "[",
            220: "\\",
            221: "]",
            222: "'",
        },

        shiftNums: {
            "`": "~",
            "1": "!",
            "2": "@",
            "3": "#",
            "4": "$",
            "5": "%",
            "6": "^",
            "7": "&",
            "8": "*",
            "9": "(",
            "0": ")",
            "-": "_",
            "=": "+",
            ";": ": ",
            "'": "\"",
            ",": "<",
            ".": ">",
            "/": "?",
            "\\": "|",
        },

        // excludes: button, checkbox, file, hidden, image, password, radio, reset, search, submit, url
        textAcceptingInputTypes: [
            "text", "password", "number", "email", "url", "range", "date", "month", "week", "time", "datetime",
            "datetime-local", "search", "color", "tel",
        ],

        // default input types not to bind to unless bound directly
        textInputTypes: /textarea|input|select/i,

        options: {
            filterInputAcceptingElements: true,
            filterTextInputs: true,
            filterContentEditable: true,
        },
    };

    function keyHandler(handle) {
        const obj = handle;

        if ('string' === typeof obj.data) {
            obj.data = {
                keys: obj.data,
            };
        }

        // Only care when a possible input has been specified
        if (!obj.data || !obj.data.keys || 'string' !== typeof obj.data.keys) {
            return;
        }

        const origHandler = obj.handler;
        const keys = obj.data.keys.toLowerCase().split(" ");

        obj.handler = function (evt) {
            //      Don't fire in text-accepting inputs that we didn't directly bind to
            if (this !== event.target &&
                (jQuery.hotkeys.options.filterInputAcceptingElements &&
                    jQuery.hotkeys.textInputTypes.test(event.target.nodeName) ||
                    jQuery.hotkeys.options.filterContentEditable && jQuery(event.target).attr('contenteditable') ||
                    jQuery.hotkeys.options.filterTextInputs &&
                        -1 < jQuery.inArray(event.target.type, jQuery.hotkeys.textAcceptingInputTypes))) {
                return;
            }

            const special = 'keypress' !== evt.type && jQuery.hotkeys.specialKeys[ event.which ];
            const character = String.fromCharCode(event.which).toLowerCase();
            let modif = "";
            const possible = {};

            jQuery.each(["alt", "ctrl", "shift"], function (index, specialKey) {

                if (event[ specialKey + 'Key' ] && special !== specialKey) {
                    modif += specialKey + '+';
                }
            });

            // metaKey is triggered off ctrlKey erronously
            if (event.metaKey && !event.ctrlKey && "meta" !== special) {
                modif += "meta+";
            }

            if (event.metaKey && "meta" !== special && -1 < modif.indexOf("alt+ctrl+shift+")) {
                modif = modif.replace("alt+ctrl+shift+", "hyper+");
            }

            if (special) {
                possible[ modif + special ] = true;
            } else {
                possible[ modif + character ] = true;
                possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

                // "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
                if ("shift+" === modif) {
                    possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
                }
            }

            for (let i = 0, l = keys.length; i < l; i++) {
                if (possible[ keys[ i ] ]) {
                    origHandler.apply(this, arguments);
                    return;
                }
            }
        };
    }

    jQuery.each(["keydown", "keyup", "keypress"], function () {
        jQuery.event.special[ this ] = { // eslint-disable-line no-invalid-this
            add: keyHandler,
        };
    });

})(jQ);
