import jQuery from 'jquery';

(jQ => {
    const $ = jQ;

    function selectElementContents(element) {
        if (window.getSelection && document.createRange) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (document.selection && document.body.createTextRange) {
            const textRange = document.body.createTextRange();
            textRange.moveToElementText(element);
            textRange.select();
        }
    }

    class Wysiwyg {

        constructor(element, opts) {
            this.selectedRange = null;
            this.editor = $(element);

            const editor = $(element);
            const defaults = {
                hotKeys: {
                    "Ctrl+b meta+b": "bold",
                    "Ctrl+i meta+i": "italic",
                    "Ctrl+u meta+u": "underline",
                    "Ctrl+z": "undo",
                    "Ctrl+y meta+y meta+shift+z": "redo",
                    "Ctrl+l meta+l": "justifyleft",
                    "Ctrl+r meta+r": "justifyright",
                    "Ctrl+e meta+e": "justifycenter",
                    "Ctrl+j meta+j": "justifyfull",
                    //"Shift+tab": "outdent",
                    //"tab": "indent"
                },
                toolbarSelector: "[data-role=editor-toolbar]",
                commandRole: "edit",
                activeToolbarClass: "btn-info",
                selectionMarker: "edit-focus-marker",
                selectionColor: "darkgrey",
                dragAndDropImages: true,
                keypressTimeout: 200,
                fileUploadError: function(reason, detail) {
                    console.log("File upload error", reason, detail);
                },
            };

            const options = $.extend(true, {}, defaults, opts);
            const toolbarBtnSelector = 'a[data-' +
                options.commandRole + "],button[data-" +
                options.commandRole + "],input[type=button][data-" +
                options.commandRole + "]";

            this.bindHotkeys(editor, options, toolbarBtnSelector);

            if (options.dragAndDropImages) {
                this.initFileDrops(editor, options, toolbarBtnSelector);
            }

            this.bindToolbar(editor, $(options.toolbarSelector), options, toolbarBtnSelector);

            editor
                .attr("contenteditable", true)
                .on("mouseup keyup mouseout", () => {
                    this.saveSelection();
                    this.updateToolbar(editor, toolbarBtnSelector, options);
                });

            $(window).bind("touchend", e => {
                const isInside = editor.is(e.target) || 0 < editor.has(e.target).length;
                const currentRange = this.getCurrentRange();
                const clear = currentRange &&
                    (currentRange.startContainer === currentRange.endContainer && currentRange.startOffset === currentRange.endOffset);

                if (!clear || isInside) {
                    this.saveSelection();
                    this.updateToolbar(editor, toolbarBtnSelector, options);
                }
            });
        }

        readFileIntoDataUrl(fileInfo) {
            const loader = $.Deferred();
            const fReader = new FileReader();

            fReader.onload = function(e) {
                loader.resolve(e.target.result);
            };

            fReader.onerror = loader.reject;
            fReader.onprogress = loader.notify;
            fReader.readAsDataURL(fileInfo);
            return loader.promise();
        }

        cleanHtml(o) {
            if (true === $(this).data("wysiwyg-html-mode")) {
                $(this).html($(this).text());
                $(this).attr("contenteditable", true);
                $(this).data("wysiwyg-html-mode", false);
            }

            // Strip the images with src="data:image/.." out;
            if (true === o && $(self).parent().is("form")) {
                const gGal = $(this).html;
                if ($(gGal).has("img").length) {
                    const gImages = $("img", $(gGal));
                    const gResults = [];
                    const gEditor = $(self).parent();
                    $.each(gImages, function(i, v) {
                        if ($(v).attr("src").match(/^data:image\/.*$/)) {
                            gResults.push(gImages[ i ]);
                            $(gEditor).prepend("<input value='" + $(v).attr("src") + "' type='hidden' name='postedimage/" + i + "' />");
                            $(v).attr("src", "postedimage/" + i);
                        }
                    });
                }
            }

            const html = $(this).html();
            return html && html.replace(/(<br>|\s|<div><br><\/div>| )*$/, "");
        }

        updateToolbar(editor, toolbarBtnSelector, options) {
            if (options.activeToolbarClass) {
                $(options.toolbarSelector).find(toolbarBtnSelector).each((i, el) => {
                    const toolbarEl = $(el);
                    const commandArr = toolbarEl.data(options.commandRole).split(" ");
                    const command = commandArr[ 0 ];

                    // If the command has an argument and its value matches this button. == used for string/number comparison
                    if (1 <= commandArr.length && document.queryCommandEnabled(command) &&
                        document.queryCommandValue(command) === commandArr[ 1 ]) {
                        toolbarEl.addClass(options.activeToolbarClass);
                    } else if (1 === commandArr.length && document.queryCommandEnabled(command) && document.queryCommandState(command)) {
                        toolbarEl.addClass(options.activeToolbarClass);
                    } else {
                        toolbarEl.removeClass(options.activeToolbarClass);
                    }
                });
            }
        }

        execCommand(commandWithArgs, valueArg, editor, options, toolbarBtnSelector) {
            const commandArr = commandWithArgs.split(" ");
            const command = commandArr.shift();
            const args = commandArr.join(" ") + (valueArg || "");

            const parts = commandWithArgs.split("-");

            if (1 === parts.length) {
                document.execCommand(command, false, args);
            } else if ('format' === parts[ 0 ] && 2 === parts.length) {
                document.execCommand("formatBlock", false, parts[ 1 ]);
            }

            $(editor).trigger("change");
            this.updateToolbar(editor, toolbarBtnSelector, options);
        }

        bindHotkeys(editor, options, toolbarBtnSelector) {

            $.each(options.hotKeys, (hotkey, command) => {
                if (!command) {
                    return;
                }

                $(editor).keydown(hotkey, e => {
                    if (editor.attr("contenteditable") && $(editor).is(":visible")) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.execCommand(command, null, editor, options, toolbarBtnSelector);
                    }
                }).keyup(hotkey, function(e) {
                    if (editor.attr("contenteditable") && $(editor).is(":visible")) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });
            });

            editor.keyup(function() {
                editor.trigger("change");
            });
        }

        getCurrentRange() {
            let sel, range;
            if (window.getSelection) {
                sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    range = sel.getRangeAt(0);
                }
            } else if (document.selection) {
                range = document.selection.createRange();
            }

            return range;
        }

        saveSelection() {
            this.selectedRange = this.getCurrentRange();
        }

        restoreSelection() {
            let selection;
            if (window.getSelection || document.createRange) {
                selection = window.getSelection();
                if (this.selectedRange) {
                    try {
                        selection.removeAllRanges();
                    } catch (ex) {
                        document.body.createTextRange().select();
                        document.selection.empty();
                    }
                    selection.addRange(this.selectedRange);
                }
            } else if (document.selection && this.selectedRange) {
                this.selectedRange.select();
            }
        }

        toggleHtmlEdit(editor) {
            const $editor = $(editor);
            if (true !== editor.data("wysiwyg-html-mode")) {
                const oContent = editor.html();
                const editorPre = $("<pre />");
                const $editorPre = $(editorPre);
                $editorPre.append(document.createTextNode(oContent));
                $editorPre.attr("contenteditable", true);
                $editor.html(" ");
                $editor.append($editorPre);
                $editor.attr("contenteditable", false);
                $editor.data("wysiwyg-html-mode", true);
                $editorPre.focus();
            } else {
                $editor.html($editor.text());
                $editor.attr("contenteditable", true);
                $editor.data("wysiwyg-html-mode", false);
                $editor.focus();
            }
        }

        insertFiles(files, options, editor, toolbarBtnSelector) {
            editor.focus();
            $.each(files, (idx, fileInfo) => {
                if (/^image\//.test(fileInfo.type)) {
                    $.when(this.readFileIntoDataUrl(fileInfo)).done(dataUrl => {
                        this.execCommand("insertimage", dataUrl, editor, options, toolbarBtnSelector);
                        editor.trigger("image-inserted");
                    }).fail(function(e) {
                        options.fileUploadError("file-reader", e);
                    });
                } else {
                    options.fileUploadError("unsupported-file-type", fileInfo.type);
                }
            });
        }

        markSelection(color/*, options*/) {
            this.restoreSelection();
            if (document.queryCommandSupported("hiliteColor")) {
                document.execCommand("hiliteColor", false, color || "transparent");
            }
            this.saveSelection();
        }

        bindToolbar(editor, toolBar, options, toolbarBtnSelector) {

            toolBar.find(toolbarBtnSelector).click(e => {
                this.restoreSelection();
                editor.focus();

                if ('html' === editor.data(options.commandRole) ) {
                    this.toggleHtmlEdit(editor);
                } else {
                    this.execCommand($(e.currentTarget).data(options.commandRole), null, editor, options, toolbarBtnSelector);
                }

                this.saveSelection();
            });

            toolBar.find( "[data-toggle=dropdown]" ).on('click', () => {
                this.markSelection(options.selectionColor, options);
            });

            toolBar.on( "hide.bs.dropdown", () => {
                this.markSelection( false, options );
            });

            toolBar.find("input[type=text][data-" + options.commandRole + "]").on("webkitspeechchange change", e => {
                const el = e.currentTarget;
                const newValue = el.value; // Ugly but prevents fake double-calls due to selection restoration
                el.value = "";
                this.restoreSelection();

                const text = window.getSelection();
                if ('' === text.toString().trim() && newValue) {
                    //create selection if there is no selection
                    this.editor.append('<span>' + newValue + '</span>');
                    selectElementContents($('span:last', self.editor)[ 0 ]);
                }

                if (newValue) {
                    editor.focus();
                    this.execCommand($(el).data(options.commandRole), newValue, editor, options, toolbarBtnSelector);
                }
                this.saveSelection();
            }).on("blur", e => {
                const input = $(e.currentTarget);
                if (input.data(options.selectionMarker)) {
                    this.markSelection(input, false, options);
                }
                this.markSelection( false, options );
            });

            toolBar.find("input[type=file][data-" + options.commandRole + "]").change(e => {
                const target = e.currentTarget;
                this.restoreSelection();
                if ('file' === target.type && target.files && 0 < target.files.length) {
                    this.insertFiles(target.files, options, editor, toolbarBtnSelector);
                }
                this.saveSelection();
                target.value = "";
            });
        }

        initFileDrops(editor, options, toolbarBtnSelector) {
            editor.on("dragenter dragover", false).on("drop", e => {
                const dataTransfer = e.originalEvent.dataTransfer;
                e.stopPropagation();
                e.preventDefault();
                if (dataTransfer && dataTransfer.files && 0 < dataTransfer.files.length) {
                    this.insertFiles(dataTransfer.files, options, editor, toolbarBtnSelector);
                }
            });
        }
    }

    $.fn.wysiwyg = function(opts) {
        const wysiwyg = new Wysiwyg(this, opts); // eslint-disable-line no-unused-vars
    };

})(jQuery);
