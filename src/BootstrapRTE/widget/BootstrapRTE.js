/*jslint white: true nomen: true plusplus: true */
/*global mx, mxui, mendix, dojo, require, console, define, module */
/**

	BootstrapRTE
	========================

	@file      : BootstrapRTE.js
	@version   : 1.0
	@author    : Gerhard Richard Edens
	@date      : 12-11-2014
	@copyright : Mendix Technology BV
	@license   : Apache License, Version 2.0, January 2004

	Documentation
    ========================
	Describe your widget here.

*/

(function () {
    'use strict';

    // test
    require([

        'mxui/widget/_WidgetBase', 'dijit/_Widget', 'dijit/_TemplatedMixin', 'dijit/focus',
        'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/on', 'dojo/_base/lang', 'dojo/_base/declare', 'dojo/text', 'dojo/html', 'dojo/_base/event',
        'dojo/fx', 'dojo/fx/Toggler', 'dojo/_base/array',
        'BootstrapRTE/widget/lib/jquery', 'BootstrapRTE/widget/lib/bootstrap_wysiwyg', 'BootstrapRTE/widget/lib/external/jquery_hotkeys',
        
        /* Imports that do not need a placeholder */
        'dojo/NodeList-traverse'

    ], function (_WidgetBase, _Widget, _Templated, focusUtil, 
                  domMx, dom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, on, lang, declare, text, domHtml, domEvent,
                  coreFx, Toggler, dojoArray,
                  _jQuery, _bootstrap_wysiwyg, _jquery_hotkeys) {

        // Declare widget.
        return declare('BootstrapRTE.widget.BootstrapRTE', [ _WidgetBase, _Widget, _Templated, _jQuery, _bootstrap_wysiwyg, _jquery_hotkeys ], {

            /**
             * Internal variables.
             * ======================
             */
            _wgtNode: null,
            _contextGuid: null,
            _contextObj: null,
            _handle: null,

            // Extra variables
            _toggler : null,
            _mxObj : null,
            _inputfield : null,
            _bigBox : null,
            _toolbarNode : null,
            _validationHandle: null,
            _isToolbarDisplayed: true,

            // Template path
            templatePath: require.toUrl('BootstrapRTE/widget/templates/BootstrapRTE.html'),

            /**
             * Mendix Widget methods.
             * ======================
             */

            // DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
            postCreate: function () {

                // postCreate
                console.log('BootstrapRTE - postCreate');

                // Load CSS ... automaticly from ui directory

                // Variables
                var self = this;

                // Check settings.
                if(this.boxMaxHeight < this.boxMinHeight){
                    console.error("Widget configuration error; Bootstrap RTE: Max size is smaler the Min Size");
                }
                
                // Setup widgets
                this._setupWidget();

                // Create childnodes
                this._createChildNodes();

                // Setup events
                this._setupEvents();

            },

            // DOJO.WidgetBase -> Startup is fired after the properties of the widget are set.
            startup: function () {
                
                // postCreate
                console.log('BootstrapRTE - startup');
            },

            /**
             * What to do when data is loaded?
             */

            update: function (obj, callback) {
                // startup
                console.log('BootstrapRTE - update');

                // Release handle on previous object, if any.
                if (this._handle){
                    mx.data.unsubscribe(this._handle);
                }
                if (this._validationHandle){
                    mx.data.unsubscribe(this._validationHandle);
                }

                if(obj){
                    var self = this;
                    this._mxObj = obj;
                    
                    // set the content on update
                    domHtml.set(this._inputfield, this._mxObj.get(this.attribute));
                    
                    // fix microflow change calls
                    this._handle = mx.data.subscribe({
                        guid : this._mxObj.getGuid(),
                        callback: function(){
                            self._loadData();
                        }
                    });

                    // set the validation handle.
                    this._validationHandle = mx.data.subscribe({
                        guid     : obj.getGuid(),
                        val      : true,
                        callback : lang.hitch(this, function(validations) {
                            var val = validations[0],
                                msg = val.getReasonByAttribute(this.attribute);                            
                            if (msg) {
                                this.addError(msg);
                                val.removeAttribute(this.attribute);
                            }

                        })
                    });

                } else {
                    // Sorry no data no show!
                    console.log('BootstrapRTE  - update - We did not get any context object!');
                }

                // Execute callback.
                if(typeof callback !== 'undefined'){
                    callback();
                }
            },

            /**
             * How the widget re-acts from actions invoked by the Mendix App.
             */
            suspend: function () {
                //TODO, what will happen if the widget is suspended (not visible).
            },

            resume: function () {
                //TODO, what will happen if the widget is resumed (set visible).
            },

            enable: function () {
                //TODO, what will happen if the widget is suspended (not visible).
            },

            disable: function () {
                //TODO, what will happen if the widget is resumed (set visible).
            },

            unintialize: function () {
                //TODO, clean up only events
                if (this._handle) {
                    mx.data.unsubscribe(this._handle);
                }
            },


            /**
             * Extra setup widget methods.
             * ======================
             */
            _setupWidget: function () {

                // Load CSS file
                mxui.dom.addCss(require.toUrl('BootstrapRTE/widget/lib/font/css/font-awesome.css'));
                
                // Setup jQuery
                this.$ = _jQuery().jQuery();
                
                // Enhance jQuery with Bootstrap WYSIWYG editor.
                this.$ = _bootstrap_wysiwyg().bootstrapWysiwyg(this.$);
                
                // Enabled hotkeys
                this.$ = _jquery_hotkeys().loadJQueryHotkeys(this.$);

                // To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
                this._wgtNode = this.domNode;

            },

            // Create child nodes.
            _createChildNodes: function () {

                // Assigning externally loaded library to internal variable inside function.
                var $ = this.$;

                // Create input field.
                this._inputfield = mxui.dom.create('div', { 'id' : this.id + '_editor' });

                // Created toolbar and editor.
                this._createToolbar();
                this._addEditor();
                
                console.log('BootstrapRTE - createChildNodes events');
            },

            // Attach events to newly created nodes.
            _setupEvents: function () {
                
                var self = this,
                    handleFocus = null,
                    inFocus = null;

                console.log('BootstrapRTE - setup events');

                // Display toolbar or not on focus
                if(this.showToolbarOnlyOnFocus){

                    domStyle.set(self._toolbarNode, "display", "none"); //Maybe box is first in tab order, does this need to be checked?
                    
                    this._isToolbarDisplayed = false;
                    
                    this._toggler = new Toggler({
                        node: self._toolbarNode,
                        showFunc: coreFx.wipeIn,
                        hideFunc: coreFx.wipeOut
                    });
                    
                    handleFocus = focusUtil.watch("curNode", function(name, oldValue, newValue) {
                        inFocus = self._inFocus(self.domNode, newValue);
                        if (inFocus && ! self._isToolbarDisplayed){
                            self._toggler.show();
                            self._isToolbarDisplayed = true;
                        } else if(!inFocus && self._isToolbarDisplayed) {
                            self._toggler.hide();
                            self._isToolbarDisplayed = false;
                        }
                    });
                    
                }

            },


            /**
             * Interaction widget methods.
             * ======================
             */
            _loadData: function () {

                // Set the html of the inputfield after update!
                domHtml.set(this._inputfield, this._mxObj.get(this.attribute));
            
            },

            /**
             * Custom widget functions
             */
            _inFocus :function(node, newValue){
                var nodes = null,
                    i = 0;
                
                if(newValue){
                    nodes = domQuery(node).children().andSelf();
                    for(i=0; i < nodes.length; i++ ){
                        if(nodes[i] === newValue) {
                            return true;
                        }
                    }
                } else {
                    return false;
                }
            },

            _createToolbar : function(){

                // Variables.
                var self = this,
                    //Freedom to create our own toolbar. With freedom comes responsibility.
                    //Below we define all the buttons that we'll render.
                    toolbarButtons = [],
                    group = null;

                // Create toolbar.
                this._toolbarNode = mxui.dom.create('div', { 'class' : 'btn-toolbar toolbar_' + this.id, 'data-role' : 'editor-toolbar-' + this.id , 'data-target' : '#' + this.id + '_editor' });

                // Create toolbar button font
                if(this.toolbarButtonFont){
                    toolbarButtons.push([
                        {
                            toggle: 'font',
                            icon: 'font',
                            fonts: [
                                {name : 'Arial'},
                                {name : 'Courier'},
                                {name : 'Helvetica'},
                                {name : 'Lucida Grande'},
                                {name : 'Times New Roman'},
                                {name : 'Verdana'}
                            ]
                        }
                    ]);
                }

                if(this.toolbarButtonFontsize){
                    toolbarButtons.push([
                        {
                            toggle: 'fontsize',
                            icon: 'text-height',
                            sizes: [
                                {type: 'h1', name: 'Header 1'},
                                {type: 'h2', name: 'Header 2'},
                                {type: 'h3', name: 'Header 3'},
                                {type: 'p', name:'Normal'}
                            ]
                        }
                    ]);
                }

                if(this.toolbarButtonEmphasis){
                    toolbarButtons.push([
                        { type: 'bold', icon: 'bold' },
                        { type: 'italic', icon: 'italic' },
                        { type: 'underline', icon: 'underline' },
                        { type: 'strikethrough', icon: 'strikethrough' }
                    ]);
                }

                if(this.toolbarButtonList || this.toolbarButtonDent){
                    group = [];
                    if(this.toolbarButtonList){
                        group.push({type: 'insertunorderedlist', icon: 'list-ul'});
                        group.push({type: 'insertorderedlist', icon: 'list-ol'});
                    }
                    if(this.toolbarButtonDent){
                        group.push({type: 'outdent', icon: 'indent-left'});
                        group.push({type: 'indent', icon: 'indent-right'});
                    }
                    toolbarButtons.push(group);
                }

                if(this.toolbarButtonJustify){
                    toolbarButtons.push([
                        {type: 'justifyleft', icon: 'align-left'},
                        {type: 'justifycenter', icon: 'align-center'},
                        {type: 'justifyright', icon: 'align-right'},
                        {type: 'justifyfull', icon: 'align-justify'}
                    ]);
                }

                if(this.toolbarButtonLink){
                    toolbarButtons.push([
                        {toggle: 'hyperlink', icon: 'link'},
                        {type: 'unlink', icon: 'unlink'}
                    ]);
                }

                if(this.toolbarButtonPicture){
                    toolbarButtons.push([
                        {toggle: 'picture', icon: 'picture'}
                    ]);
                }

                if(this.toolbarButtonDoRedo){
                    toolbarButtons.push([
                        {type: 'undo', icon: 'undo'},
                        {type: 'redo', icon: 'repeat'}
                    ]);
                }

                // For each.
                dojoArray.forEach(toolbarButtons, function(list, index){
                    self._createGroupedTools(list);
                });
            },

            _createGroupedTools : function(buttons) {

                // Variables
                var group = mxui.dom.create('div', { 'class' : 'btn-group' }),
                    self = this;

                dojoArray.forEach(buttons, function(type, index){
                    if(type.toggle === 'font'){
                        self._createFonts(type, group);
                    } else if(type.toggle === 'fontsize'){
                        //this is the dropdown menu rendering for the font size
                        self._createFontSize(type, group);
                    } else if (type.toggle === 'hyperlink'){
                        //Create Linkfield
                        self._createHyperlink(type, group);
                    } else if(type.toggle === 'picture') {
                        self._createPicture(type, group);
                    } else {

                        // Variables
                        var button = mxui.dom.create('a', { 'class' : 'btn', 'data-edit' : type.type }),
                            icon = mxui.dom.create('i', { 'class' : 'icon-' + type.icon });

                        domConstruct.place(icon, button);
                        domConstruct.place(button, group, 'last');
                    }
                });

                domConstruct.place(group, this._toolbarNode);

            },

            _createFonts : function(type, group){

                // Variables
                var button = mxui.dom.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown' }),
                    icon = mxui.dom.create('i', { 'class' : 'icon-' + type.icon }),
                    caret  = mxui.dom.create('b', {'class' : 'caret'}),
                    ul = mxui.dom.create('ul', {'class' : 'dropdown-menu'}),
                    self = this;

                // Place icon and caret
                domConstruct.place(icon, button);
                domConstruct.place(caret, button);

                // Create HTML elements
                dojoArray.forEach(type.fonts, function(font, index){

                    // Variables
                    var item = mxui.dom.create('li'),
                        fontTag = mxui.dom.create('a', {'data-edit' : 'fontName ' + font.name});

                    // Create
                    domHtml.set(fontTag, font.name);
                    domConstruct.place(fontTag, item);
                    domConstruct.place(item, ul);
                    domStyle.set(fontTag, {
                        'fontFamily' : font.name
                    });

                    self.connect(fontTag, 'click', function(e){
                        domQuery('#' + self.id + ' .dropdown-menu').style ({ 'display' : 'none' });
                    });

                });

                // Place button and ul.
                domConstruct.place(button, group, 'last');
                domConstruct.place(ul, group, 'last');
            },

            _createFontSize : function(type, group) {

                // Variables
                var button = mxui.dom.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown' }),
                    icon = mxui.dom.create('i', { 'class' : 'icon-' + type.icon }),
                    caret  = mxui.dom.create('b', {'class' : 'caret'}),
                    ul = mxui.dom.create('ul', {'class' : 'dropdown-menu'}),
                    self = this;

                // Place icon and caret
                domConstruct.place(icon, button);
                domConstruct.place(caret, button);

                dojoArray.forEach(type.sizes, function(size, index){

                    // Variables
                    var item = mxui.dom.create('li'),
                        sizetag = mxui.dom.create('a', {'data-edit' : 'formatBlock ' + size.type});

                    // Create HTML.
                    domHtml.set(sizetag, '<'+ size.type +'>' + size.name + '</' + size.type + '>');
                    self.connect(sizetag, 'click', function(e){
                        domQuery('#' + self.id + ' .dropdown-menu').style ({ 'display' : 'none' });
                    });
                    domConstruct.place(sizetag, item);
                    domConstruct.place(item, ul);

                });

                // Place button and ui.
                domConstruct.place(button, group);
                domConstruct.place(ul, group);

            },

            _createHyperlink : function(type, group){

                // Variables
                var button = mxui.dom.create('a', { 'class' : 'btn dropdown-toggle', 'title' : '', 'data-toggle' : 'dropdown', 'data-original-title' : 'hyperlink'}),
                    icon = mxui.dom.create('i', { 'class' : 'icon-' + type.icon }),
                    dropurl = mxui.dom.create('div', {'class' : 'dropdown-menu input-append'}),
                    urlfield = mxui.dom.create('input', {'class' : 'span2', 'type' : 'text', 'data-edit' : 'createLink', 'placeholder' : 'URL'}),
                    urlbutton = mxui.dom.create('button', {'class' : 'btn', 'type' : 'button'}),
                    self = this;

                domHtml.set(urlbutton, 'Add');

                // We need to stop event bubbling for IE 11.
                this.connect(urlfield, 'click', function(e){
                    var target = e.currentTarget || e.target;
                    target.focus();
                    domEvent.stop(e);
                });
                
                this.connect(urlbutton, 'click', function(e){
                    domQuery('#' + self.id + ' .dropdown-menu').style ({ 'display' : 'none' });
                });

                domConstruct.place(urlfield, dropurl);
                domConstruct.place(urlbutton, dropurl, 'last');

                domConstruct.place(icon, button);
                domConstruct.place(button, group, 'last');
                domConstruct.place(dropurl, group, 'last');
            },

            _createPicture : function(type, group) {

                // Variables
                var button = mxui.dom.create('a', { 'id': 'pictureBtn' + this.id, 'class' : 'btn'}),
                    icon = mxui.dom.create('i', { 'class' : 'icon-' + type.icon }),
                    pictureInput = mxui.dom.create('input', {'id' : 'pictureBtnInput' + this.id , 'type' : 'file', 'data-edit' : 'insertImage', 'data-target' : '#pictureBtn' + this.id, 'data-role' : 'magic-overlay'});

                domConstruct.place(icon, button);
                domConstruct.place(button, group, 'last');
                domConstruct.place(pictureInput, group, 'last');

                domStyle.set(button, {
                    'position'	: 'relative'
                });

                domStyle.set(pictureInput, {
                    'opacity'	: 0,
                    'position'	: 'absolute',
                    'top'		: '0.199997px', 
                    'left'		: '-0.0000366211px'
                });

            },

            _addEditor : function(){

                var $ = this.$,
                    imgBtn = null,
                    imgBtnPos = null;
                
                domConstruct.place(this._toolbarNode, this.domNode);
                domConstruct.place(this._inputfield, this.domNode, 'last');

                //fix the image button action (set height and width of overlay input) 
                imgBtn = dom.byId("pictureBtn" + this.id);
                if(imgBtn){

                    imgBtnPos = domGeom.position(imgBtn);

                    domQuery('#pictureBtnInput' + this.id).style({
                        'width' : imgBtnPos.w,
                        'height' : imgBtnPos.h
                    });
                }

                //force the MX-styles.
                domClass.add(this._inputfield, 'form-control mx-textarea-input mx-textarea-input-noresize');
                domStyle.set(this._inputfield, {
                    'min-height' : this.boxMinHeight + 'px',
                    'max-height' : this.boxMaxHeight + 'px'
                });

                $('#' + this.id + '_editor').wysiwyg({ toolbarSelector: '[data-role=editor-toolbar-'+ this.id +']'} );
                this._addListeners();

            },

            _addListeners : function() {
                var self = this,
                    target = null,
                    $ = this.$;

                this.connect(document, 'onmousedown', function(e) {
                    // The latest element clicked
                    self.target = domQuery(e.target);
                });

                // when 'target == null' on blur, we know it was not caused by a click
                this.connect(document, 'onmouseup', function(e) {
                    // The latest element clicked
                    self.target = null;
                });

                this.connect(this._inputfield, 'blur', function(e){
                    self._fetchContent();
                });

                //Ok, I'm just going to stick to jquery here for traversing the dom. Much easier.
                $('#'+ this.id +' .dropdown-toggle').on("click", function(e){
                    $(this).parent().find('div').toggle();
                    $(this).parent().find('ul').toggle();
                });

                //Check if we have to hide the dropdown box.
                this.connect(this.domNode, 'click', function(e){
                    var isContainer = self._testTarget(e);
                    if(!isContainer){
                        domQuery('#' + this.id + ' .dropdown-menu').style ({ 'display' : 'none' });
                    }
                });
            },

            _fetchContent : function() {
                
                var $ = this.$,
                    text = $(this._inputfield).html(),
                    _valueChanged = (this._mxObj.get(this.attribute) !== text);

                this._mxObj.set(this.attribute, text);

                if (_valueChanged && this.onchangeMF !== "") {
                    this._execMf(this.onchangeMF, this._mxObj.getGuid());
                }
                
            },

            _execMf : function(mf, guid){
                mx.data.action({
                    params: {
                        applyto     : "selection",
                        actionname  : mf,
                        guids : [guid]
                    }
                });
            }, 

            _testTarget : function (e) {
                //See if we clicked the same button
                var isButton = false,
                    isContainer = {},
                    value = {};

                dojoArray.forEach( domQuery('#'+ this.id +' .dropdown-toggle'), function(object, index){
                    if (!isButton){
                        isButton = domQuery(e.target).parent()[0] === object || domQuery(e.target) === object;
                    }
                });

                //See if we clicked inside the box
                isContainer =   domQuery(e.target).closest('ul').children('.dropdown-toggle').length > 0 ||
                                domQuery(e.target).children('.dropdown-toggle').length > 0 ||
                                domQuery(e.target).parent().children('.dropdown-toggle').length > 0;

                value = isContainer;
                if(isButton === true) {
                    value = isButton;
                }

                return value;
            }
        });
    });

}());


