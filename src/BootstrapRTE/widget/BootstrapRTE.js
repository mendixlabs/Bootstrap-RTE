define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/on",
    "dojo/_base/window",

    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/fx",
    "dojo/fx/Toggler",
    "dojo/html",
    "dojo/_base/event",

    "BootstrapRTE/lib/jquery",
    "dojo/text!BootstrapRTE/widget/template/BootstrapRTE.html",

    "BootstrapRTE/lib/bootstrap-wysiwyg",
    "BootstrapRTE/lib/external/jquery.hotkeys"
], function (declare, _WidgetBase, _TemplatedMixin,
    dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domAttr, domConstruct, dojoArray, on, win,
    lang, text, dojoHtml, coreFx, Toggler, domHtml, domEvent, _jQuery,
    widgetTemplate
) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget"s prototype.
    return declare("BootstrapRTE.widget.BootstrapRTE", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // nodes
        inputNode: null,
        toolbarNode: null,

        // Parameters configured in the Modeler.
        attribute: "",
        showToolbarOnlyOnFocus: false,
        boxMinHeight: 100,
        boxMaxHeight: 600,
        onchangeMF: "",
        toolbarButtonFont: true,
        toolbarButtonFontsize: true,
        toolbarButtonEmphasis: true,
        toolbarButtonList: true,
        toolbarButtonDent: true,
        toolbarButtonJustify: true,
        toolbarButtonLink: true,
        toolbarButtonPicture: true,
        toolbarButtonDoRedo: true,
        toolbarButtonHtml: true,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _readOnly: false,
        _setup: false,
        _windowClickHandler: null,

        _toolbarId: "toolbar_",
        _editorId: "editor_",

        constructor: function () {
            this._handles = [];
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
                this._readOnly = true;
            }

            this._toolbarId = "toolbar_" + this.id;
            this._editorId = "editor_" + this.id;

            domAttr.set(this.toolbarNode, "data-target", "#" + this._editorId);
            domAttr.set(this.toolbarNode, "id", this._toolbarId);
            domAttr.set(this.inputNode, "id", this._editorId);

            // Check settings.
            if (this.boxMaxHeight < this.boxMinHeight) {
                logger.error(this.id + "Widget configuration error; Bootstrap RTE: Max size is smaller the Min Size");
            }
        },

        update: function (obj, callback) {

            if (this.readOnly || this.get("disabled") || this.readonly) {
                this._readOnly = true;
            }

            if (!this._setup) {
                this._setupWidget(lang.hitch(this, this.update, obj, callback));
                return;
            }

            logger.debug(this.id + ".update");

            if (obj) {
                this._mxObj = obj;

                // set the content on update
                domHtml.set(this.inputNode, this._mxObj.get(this.attribute));
                this._resetSubscriptions();
            } else {
                // Sorry no data no show!
                logger.warn(this.id + ".update - We did not get any context object!");
            }

            this._executeCallback(callback, "update");
        },

        _setupWidget: function (callback) {
            logger.debug(this.id + "._setupWidget");
            this._setup = true;

            //domAttr.remove(this.domNode, "focusindex");

            this._createChildNodes();
            this._setupEvents();

            this._executeCallback(callback, "_setupWidget");
        },

        // Create child nodes.
        _createChildNodes: function () {
            logger.debug(this.id + "._createChildNodes");

            // Created toolbar and editor.
            this._createToolbar();
            this._addEditor();
        },

        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");

            if (this.showToolbarOnlyOnFocus) {
                domStyle.set(this.toolbarNode, "display", "none"); //Maybe box is first in tab order, does this need to be checked?

                this._isToolbarDisplayed = false;

                this._toggler = new Toggler({
                    node: this.toolbarNode,
                    showFunc: coreFx.wipeIn,
                    hideFunc: coreFx.wipeOut
                });

                this.connect(this.domNode, "click", lang.hitch(this, function (event) {
                    var inFocus = this._inFocus(this.domNode, event.target);
                    if (inFocus && !this._isToolbarDisplayed) {
                        this._toggler.show();
                        this._isToolbarDisplayed = true;
                    } else if (!inFocus && this._isToolbarDisplayed) {
                        this._toggler.hide();
                        this._isToolbarDisplayed = false;
                    }
                }));

                this._windowClickHandler = on(win.doc, "click", lang.hitch(this, function (event) {
                    var inFocus = this._inFocus(this.domNode, event.target);
                    if (!inFocus && this._isToolbarDisplayed) {
                        this._toggler.hide();
                        this._isToolbarDisplayed = false;
                    }
                }));
            }
        },

        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");

            this.unsubscribeAll();

            if (this._mxObj) {
                this.subscribe({
                    guid: this._mxObj.getGuid(),
                    callback: lang.hitch(this, this._loadData)
                });

                // This doesn't work yet
                // this.subscribe({
                //     guid: this._mxObj.getGuid(),
                //     attr: this.attribute,
                //     callback: lang.hitch(this, this._loadData)
                // });

                this.subscribe({
                    guid: this._mxObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });
            }
        },

        _inFocus: function (node, newValue) {
            logger.debug(this.id + "._inFocus");
            var nodes = null,
                i = 0;
            if (newValue) {
                nodes = $(node).children().andSelf();
                for (i = 0; i < nodes.length; i++) {
                    if (nodes[i] === $(newValue).closest(nodes[i])[0]) {
                        return true;
                    }
                }
            } else {
                return false;
            }
        },

        _loadData: function () {
            logger.debug(this.id + "._loadData");
            domHtml.set(this.inputNode, this._mxObj.get(this.attribute));
        },

        _createToolbar: function () {
            logger.debug(this.id + "._createToolbar");

            domClass.toggle(this.btnGrpFont, "hidden", !this.toolbarButtonFont);
            domClass.toggle(this.btnGrpFontSize, "hidden", !this.toolbarButtonFontsize);
            domClass.toggle(this.btnGrpBasic, "hidden", !this.toolbarButtonEmphasis);
            domClass.toggle(this.btnGrpList, "hidden", !this.toolbarButtonList);
            domClass.toggle(this.btnGrpDent, "hidden", !this.toolbarButtonDent);
            domClass.toggle(this.btnGrpJustify, "hidden", !this.toolbarButtonJustify);
            domClass.toggle(this.btnGrpLink, "hidden", !this.toolbarButtonLink);
            domClass.toggle(this.btnGrpImg, "hidden", !this.toolbarButtonPicture);
            domClass.toggle(this.btnGrpHtml, "hidden", !this.toolbarButtonHtml);
            domClass.toggle(this.btnGrpUnRedo, "hidden", !this.toolbarButtonDoRedo);

            if (this.toolbarButtonLink) {
                this.connect(this.btnGrpLink_linkField, "click", function(e){
                    var target = e.currentTarget || e.target;
                    target.focus();
                    domEvent.stop(e);
                });
            }
        },

        _addEditor: function () {
            logger.debug(this.id + "._addEditor");

            //force the MX-styles.
            domStyle.set(this.inputNode, {
                "min-height": this.boxMinHeight + "px",
                "max-height": this.boxMaxHeight + "px"
            });

            $(this.inputNode).wysiwyg({
                toolbarSelector: "#" + this._toolbarId
            });

            if (this._readOnly) {
                $(this.inputNode).attr("contenteditable", "false");
                $("#" + this._toolbarId).find("a").addClass("disabled");
            }

            this._addListeners();
        },

        _addListeners: function () {
            logger.debug(this.id + "._addListeners");
            var self = this,
                target = null;

            this.connect(this.inputNode, "blur", lang.hitch(this, function (e) {
                if (!this._readOnly) {
                    this._fetchContent();
                }
            }));

            //Ok, I"m just going to stick to jquery here for traversing the dom. Much easier.
            $("#" + this.id + " .dropdown-toggle").on("click", function (e) {
                $(this).parent().find("div").toggle();
                $(this).parent().find("ul").toggle();
                $(this).parent().find("input").focus();
            });

            //Check if we have to hide the dropdown box.
            this.connect(this.domNode, "click", function (e) {
                var isContainer = self._testTarget(e);
                if (!isContainer) {
                    domQuery("#" + this.id + " .dropdown-menu").style({
                        "display": "none"
                    });
                }
            });
        },

        _fetchContent: function () {
            logger.debug(this.id + "._fetchContent");
            var text = $(this.inputNode).html(),
                _valueChanged = (this._mxObj && this._mxObj.get(this.attribute) !== text);

            this._mxObj.set(this.attribute, text);

            if (_valueChanged) {
                this._clearValidations();
            }

            if (_valueChanged && this.onchangeMF !== "") {
                this._execMF(this._mxObj, this.onchangeMF);
            }

        },

        _execMF: function (obj, mf) {
            logger.debug(this.id + "._execMF", mf);
            if (mf) {
                var params = {
                    applyto: "selection",
                    guids: []
                };
                if (obj) {
                    params.guids = [obj.getGuid()];
                }
                mx.ui.action(mf, {
                    params: params
                }, this);
            }
        },

        _testTarget: function (e) {
            logger.debug(this.id + "._testTarget");
            //See if we clicked the same button
            var isButton = false,
                isContainer = {},
                value = {};

            dojoArray.forEach(domQuery("#" + this.id + " .dropdown-toggle"), function (object, index) {
                if (!isButton) {
                    isButton = $(e.target).parent()[0] === object || $(e.target) === object;
                }
            });

            //See if we clicked inside the box
            isContainer = $(e.target).closest("ul").children(".dropdown-toggle").length > 0 ||
                $(e.target).children(".dropdown-toggle").length > 0 ||
                $(e.target).parent().children(".dropdown-toggle").length > 0;

            value = isContainer;
            if (isButton === true) {
                value = isButton;
            }

            return value;
        },

        _handleValidation: function(validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.attribute);

            if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.attribute);
            }
        },

        _clearValidations: function() {
            logger.debug(this.id + "._clearValidations");
            domClass.toggle(this.domNode, "has-error", false);
            domConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        _showError: function(message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = domConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            domConstruct.place(this._alertDiv, this.domNode);
            domClass.toggle(this.domNode, "has-error", true);
        },

        // Add a validation.
        _addValidation: function(message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            if (this._windowClickHandler) {
                this._windowClickHandler.remove();
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["BootstrapRTE/widget/BootstrapRTE"]);
