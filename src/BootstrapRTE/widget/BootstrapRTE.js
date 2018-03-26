import {
    defineWidget,
    log,
    runCallback,
    executePromise,
} from 'widget-base-helpers';

import jQuery from 'jquery';

import './lib/jquery.hotkeys';
import './lib/bootstrap-wysiwyg';

import template from './BootstrapRTE.template.html';

import './BootstrapRTE.scss';

import domAttr from 'dojo/dom-attr';
import html from 'dojo/html';
import lang from 'dojo/_base/lang';
import domStyle from 'dojo/dom-style';
import domClass from 'dojo/dom-class';
import dojoArray from 'dojo/_base/array';
import domEvent from 'dojo/_base/event';
import coreFx from 'dojo/fx';
import Toggler from 'dojo/fx/Toggler';
import on from 'dojo/on';
import { doc } from 'dojo/_base/window';
import domQuery from 'dojo/query';

import { destroy, create, place } from 'dojo/dom-construct';

const $ = jQuery.noConflict();

export default defineWidget('BootstrapRTE', template, {

    // nodes
    inputNode: null,
    toolbarNode: null,

    // Parameters configured in the Modeler.
    attribute: '',
    showToolbarOnlyOnFocus: false,
    boxMinHeight: 100,
    boxMaxHeight: 600,
    onchangeMF: '',
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
    _obj: null,
    _readOnly: false,
    _setup: false,
    _windowClickHandler: null,

    _toolbarId: 'toolbar_',
    _editorId: 'editor_',

    constructor() {
        this.log = log.bind(this);
        this.runCallback = runCallback.bind(this);
        this.executePromise = executePromise.bind(this);
    },

    postCreate() {
        this.log('postCreate', this._WIDGET_VERSION);

        this._readOnly = !!(this.readOnly || this.get('disabled') || this.readonly);

        this._toolbarId = `toolbar_${this.id}`;
        this._toolbarIdSelector = `#${this._toolbarId}`;
        this._editorID = `editor_${this.id}`;

        domAttr.set(this.toolbarNode, 'data-target', `#${this._editorID}`);
        domAttr.set(this.toolbarNode, 'id', this._toolbarId);
        domAttr.set(this.inputNode, 'id', this._editorID);

        if (this.boxMaxHeight < this.boxMinHeight) {
            console.error(this.id + ':: Widget configuration error; Bootstrap RTE: Max size is smaller the Min Size');
        }

        if (this.addOnDestroy) {
            this.addOnDestroy(this._onWidgetDestroy.bind(this));
        } else {
            this.unintialize = () => {
                this.log('uninitialize');
                this._onWidgetDestroy();
            };
        }
    },

    _strReadOnly() {
        return this._obj.isReadonlyAttr && this._obj.isReadonlyAttr(this.attribute);
    },

    _onWidgetDestroy() {
        this._windowClickHandler && this._windowClickHandler.remove();
    },

    update(obj, callback) {
        if (!this._setup) {
            this._setupWidget(lang.hitch(this, this.update, obj, callback));
            return;
        }

        this.log('update');

        if (obj) {
            this._obj = obj;

            if (this.readOnly || this.get('disabled') || this.readonly || this._strReadOnly()) {
                this._readOnly = true;
                this._disableEditing();
            }

            html.set(this.inputNode, this._obj.get(this.attribute));
            this._resetSubscriptions();

        } else {
            window.logger.warn(`${this.id}.update :: No context object`);
        }

        this.runCallback(callback, 'update');
    },

    _disableEditing() {
        try {
            domAttr.set(this.inputNode, 'contenteditable', 'false');
            $('#' + this._toolbarId).find('a').addClass('disabled');
        } catch (error) {
            window.logger.debug(error);
        }
    },

    _setupWidget(callback) {
        this.log('_setupWidget');
        this._setup = true;

        this._createChildNodes();
        this._setupEvents();

        this.runCallback(callback, '_setupWidget');
    },

    _createChildNodes() {
        this.log('_createChildNodes');

        this._createToolbar();
        this._addEditor();
    },

    _setupEvents() {
        this.log('_setupEvents');

        if (this.showToolbarOnlyOnFocus) {
            domStyle.set(this.toolbarNode, 'display', 'none'); //Maybe box is first in tab order, does this need to be checked?

            this._isToolbarDisplayed = false;

            this._toggler = new Toggler({
                node: this.toolbarNode,
                showFunc: coreFx.wipeIn,
                hideFunc: coreFx.wipeOut,
            });

            this.connect(this.domNode, 'click', clickEvt => {
                const inFocus = this._inFocus(this.domNode, clickEvt.target);
                if (inFocus && !this._isToolbarDisplayed) {
                    this._toggler.show();
                    this._isToolbarDisplayed = true;
                } else if (!inFocus && this._isToolbarDisplayed) {
                    this._toggler.hide();
                    this._isToolbarDisplayed = false;
                }
            });

            this._windowClickHandler = on(doc, 'click', clickEvt => {
                const inFocus = this._inFocus(this.domNode, clickEvt.target);
                if (!inFocus && this._isToolbarDisplayed) {
                    this._toggler.hide();
                    this._isToolbarDisplayed = false;
                }
            });
        }
    },

    _resetSubscriptions() {
        this.log('_resetSubscriptions');

        this.unsubscribeAll();

        if (this._obj) {
            this.subscribe({
                guid: this._obj.getGuid(),
                callback: this._loadData.bind(this),
            });

            this.subscribe({
                guid: this._obj.getGuid(),
                val: true,
                callback: this._handleValidation.bind(this),
            });
        }

    },

    _inFocus(node, newVal) {
        this.log('_inFocus');
        if (newVal) {
            const nodes = $(node).children().addBack();
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[ i ] === $(newVal).closest(nodes[ i ])[ 0 ]) {
                    return true;
                }
            }
        }
        return false;
    },

    _loadData() {
        this.log('_loadData');

        html.set(this.inputNode, this._obj.get(this.attribute));
    },

    _createToolbar() {
        this.log('_createToolbar');

        domClass.toggle(this.btnGrpFont, 'hidden', !this.toolbarButtonFont);
        domClass.toggle(this.btnGrpFontSize, 'hidden', !this.toolbarButtonFontsize);
        domClass.toggle(this.btnGrpBasic, 'hidden', !this.toolbarButtonEmphasis);
        domClass.toggle(this.btnGrpList, 'hidden', !this.toolbarButtonList);
        domClass.toggle(this.btnGrpDent, 'hidden', !this.toolbarButtonDent);
        domClass.toggle(this.btnGrpJustify, 'hidden', !this.toolbarButtonJustify);
        domClass.toggle(this.btnGrpLink, 'hidden', !this.toolbarButtonLink);
        domClass.toggle(this.btnGrpImg, 'hidden', !this.toolbarButtonPicture);
        domClass.toggle(this.btnGrpHtml, 'hidden', !this.toolbarButtonHtml);
        domClass.toggle(this.btnGrpUnRedo, 'hidden', !this.toolbarButtonDoRedo);

        if (this.toolbarButtonLink) {
            this.connect(this.btnGrpLink_linkField, 'click', e => {
                const target = e.currentTarget || e.target;
                target.focus();
                domEvent.stop(e);
            });
        }
    },

    _addEditor() {
        this.log('_addEditor');

        //force the MX-styles.
        domStyle.set(this.inputNode, {
            'min-height': this.boxMinHeight + 'px',
            'max-height': this.boxMaxHeight + 'px',
        });

        $(this.inputNode).wysiwyg({
            toolbarSelector: '#' + this._toolbarId,
        });

        if (this._readOnly) {
            this._disableEditing();
        }

        this._addListeners();
    },

    _addListeners() {
        this.log('_addListeners');

        this.connect(this.inputNode, 'blur', () => {
            if (!this._readOnly) {
                this._fetchContent();
            }
        });

        //Ok, I'm just going to stick to jquery here for traversing the dom. Much easier.
        $(`#${this.id} *[data-toggle="dropdown"]`).on('click', e => {
            const target = $(e.currentTarget);
            target.parent().find('div').toggle();
            target.parent().find('ul').toggle();
            target.parent().find('input').focus();
        });

        //Check if we have to hide the dropdown box.
        this.connect(this.domNode, 'click', e => {
            const isContainer = this._testTarget(e);
            if (!isContainer) {
                domQuery('#' + this.id + ' .dropdown-menu').style({
                    'display': 'none',
                });
            }
        });
    },

    _fetchContent() {
        this.log('_fetchContent');

        const text = $(this.inputNode).html();
        const _valueChanged = this._obj && this._obj.get(this.attribute) !== text;

        this._obj.set(this.attribute, text);

        if (_valueChanged) {
            this._clearValidations();
        }

        if (_valueChanged && '' !== this.onchangeMF) {
            this.executePromise(this.onchangeMF, this._obj ? this._obj.getGuid() : null);
        }

    },

    _testTarget(e) {
        this.log('_testTarget');

        //See if we clicked the same button
        let isButton = false,
            value = {};

        dojoArray.forEach(domQuery('#' + this.id + ' .dropdown-link'), object => {
            if (!isButton) {
                isButton = $(e.target).parent()[ 0 ] === object || $(e.target) === object;
            }
        });

        //See if we clicked inside the box
        const isContainer = 0 < $(e.target).closest('ul').children('.dropdown-link').length ||
            0 < $(e.target).children('.dropdown-link').length ||
            0 < $(e.target).parent().children('.dropdown-link').length;

        value = isContainer;

        if (isButton) {
            value = isButton;
        }

        return value;
    },

    _handleValidation(validations) {
        this.log('_handleValidation');

        this._clearValidations();

        const validation = validations[ 0 ];
        const message = validation.getReasonByAttribute(this.attribute);

        if (message) {
            this._addValidation(message);
            validation.removeAttribute(this.attribute);
        }
    },

    _clearValidations() {
        this.log('_clearValidations');

        domClass.toggle(this.domNode, 'has-error', false);
        destroy(this._alertDiv);
        this._alertDiv = null;
    },

    _showError(message) {
        this.log('_showError');

        if (null !== this._alertDiv) {
            html.set(this._alertDiv, message);
            return;
        }

        this._alertDiv = create('div', {
            'class': 'alert alert-danger',
            'innerHTML': message,
        });

        place(this._alertDiv, this.domNode);
        domClass.toggle(this.domNode, 'has-error', true);
    },

    _addValidation(message) {
        this.log('_addValidation');

        this._showError(message);
    },
});
