Ext.ns('MarkdownEditor');
MarkdownEditor = function(config) {
    config = config || {};
    MarkdownEditor.superclass.constructor.call(this,config);
};
Ext.extend(MarkdownEditor,Ext.Component,{
    window:{},config: {}
});
Ext.reg('markdowneditor',MarkdownEditor);
markdownEditor = new MarkdownEditor();

markdownEditor.Editor = function(config) {
    config = config || {};
    config.resource = MODx.request.id || 0;
    markdownEditor.Editor.superclass.constructor.call(this,config);
    this.config = config;
};
Ext.extend(markdownEditor.Editor,Ext.Component,{
    remarkable: ''
    ,fullScreen: false
    ,initComponent: function() {
        MarkdownEditor.superclass.initComponent.call(this);

        Ext.onReady(this.render, this);
    }

    ,render: function() {
        this.textarea = Ext.get('ta');
        if (!this.textarea) return;

        this.buildUI();
        this.registerAce();
        this.registerMarked();

        this.toolBox = Ext.get(Ext.DomHelper.append(this.contentMD,{
            tag: 'div',
            class: 'toolbox',
            cn: [{
                tag: 'div',
                class: 'preview-button',
                html: '<i class="icon icon-eye icon-large"></i>'
            },{
                tag: 'div',
                class: 'splitscreen-button',
                html: '<i class="icon icon-pause icon-large"></i>'
            },{
                tag: 'div',
                class: 'fullscreen-button',
                html: '<i class="icon icon-expand icon-large"></i>'
            }]
        }));

        var previewButton = this.toolBox.child('.preview-button');
        var fullscreenButton = this.toolBox.child('.fullscreen-button');
        var splitscreenButton = this.toolBox.child('.splitscreen-button');



        var content = this.contentMD;
        var wrapper = content.parent();

        var previewButtonOff = Ext.get(Ext.DomHelper.append(wrapper,{
            tag: 'div',
            class: 'preview-button-off',
            html: '<i class="icon icon-eye-slash icon-large"></i>',
            hidden: true
        }));

        var dropTarget = MODx.load({
            xtype: 'modx-treedrop',
            target: content,
            targetEl: content,
            onInsert: (function(s){
                this.insert(s);
                this.focus();
                return true;
            }).bind(this.editor),
            iframe: true
        });
        this.textarea.on('destroy', function() {dropTarget.destroy();});

        previewButton.addListener('click', function () {
            this.preview.setDisplayed('block');
            content.setDisplayed('none');
            this.statusBar.setDisplayed('none');

            previewButtonOff.show()
        }, this);

        previewButtonOff.addListener('click', function () {
            this.preview.setDisplayed('none');
            content.setDisplayed('block');
            this.statusBar.setDisplayed('block');

            this.editor.focus();

            previewButtonOff.hide();
        }, this);

        splitscreenButton.addListener('click', function () {
            if (splitscreenButton.child('i').hasClass('icon-pause')) {

                splitscreenButton.child('i').removeClass('icon-pause');
                splitscreenButton.child('i').addClass('icon-stop');

                if (this.fullScreen == true) {
                    previewButton.hide();
                }
            } else {

                splitscreenButton.child('i').removeClass('icon-stop');
                splitscreenButton.child('i').addClass('icon-pause');

                if (this.fullScreen == true) {
                    previewButton.show();
                }
            }
        }, this);

        fullscreenButton.addListener('click', function () {
            var icon = fullscreenButton.child('i');

            if (this.fullScreen == false) {
                this.fullScreen = true;
                icon.removeClass('icon-expand');
                icon.addClass('icon-compress');

                splitscreenButton.child('i').removeClass('icon-pause');
                splitscreenButton.child('i').addClass('icon-stop');

                this.preview.setDisplayed('block');
                content.setDisplayed('block');

                this.editor.focus();

                previewButton.hide();

                wrapper.addClass('fullscreen');

                this.editor.setOption('maxLines', null);

            } else {
                this.fullScreen = false;
                icon.addClass('icon-expand');
                icon.removeClass('icon-compress');

                this.preview.setDisplayed('none');
                content.setDisplayed('block');

                this.editor.focus();

                previewButton.show();

                wrapper.removeClass('fullscreen');

                this.editor.setOption('maxLines', Infinity);
            }

            this.statusBar.setDisplayed('block');

            this.editor.resize(true);
        }, this);

        if (markdownEditor.content.content) {
            this.editor.setValue(markdownEditor.content.content);
        }
        this.editor.selection.clearSelection();

        this.preview.update(this.parse(this.editor.getValue()));

        this.editor.getSession().on('change', function(e){
            this.parse(this.editor.getValue());
        }.bind(this));
    }

    ,buildUI: function() {
        this.textarea.setDisplayed('none');
        this.textarea.setWidth(0);
        this.textarea.setHeight(0);

        this.taMarkdown = Ext.get(Ext.DomHelper.insertBefore(this.textarea, {
            tag: 'textarea',
            name: 'ta_markdown',
            class: 'ta_markdown'
        }));

        this.taMarkdown.setDisplayed('none');
        this.taMarkdown.setWidth(0);
        this.taMarkdown.setHeight(0);

        var wrapper = Ext.DomHelper.insertBefore(this.textarea, {
            tag: 'div',
            class: 'markdown-container'
        });

        this.contentMD = Ext.get(Ext.DomHelper.append(wrapper,{
            tag: 'div',
            class: this.textarea.dom.className + ' content-md'
        }));

        this.preview = Ext.get(Ext.DomHelper.append(wrapper,{
            tag: 'div',
            class: 'markdown-body preview-md'
        }));

        if (MODx.config['markdowneditor.upload.enable_image_upload'] == 1 || MODx.config['markdowneditor.upload.enable_file_upload'] == 1) {
            this.statusBar = Ext.get(Ext.DomHelper.append(wrapper,{
                tag: 'div',
                class: 'status-bar'
            }));

            if (this.isMobileDevice()) {
                this.statusBar.dom.innerHTML = '<div class="upload-bar"> <input class="hidden" name="file" id="' + this.statusBar.id + '-file" type="file" multiple /><input class="hidden" name="file-mobile" id="' + this.statusBar.id + '-file-mobile" type="file" accept="image/*" capture="camera" />' + _('markdowneditor.status_bar_message_mobile', {id: this.statusBar.id + '-file', id_mobile: this.statusBar.id + '-file-mobile'}) + '</div>';

                this.statusBar.child('#' + this.statusBar.id + '-file-mobile').on('change', function(e, input) {
                    this.handleFiles(input.files, 1);
                    input.value = "";
                }, this);
            } else {
                this.statusBar.dom.innerHTML = '<div class="upload-bar"> <input class="hidden" name="file" id="' + this.statusBar.id + '-file" type="file" multiple>' + _('markdowneditor.status_bar_message', {id: this.statusBar.id + '-file'}) + '</div>';

                this.statusBar.child('#' + this.statusBar.id + '-file').on('change', function(e, input) {
                    this.handleFiles(input.files);
                    input.value = "";
                }, this);
            }

        } else {
            this.statusBar = Ext.get(Ext.DomHelper.append(wrapper,{
                tag: 'div',
                class: 'status-bar',
                html: _('markdowneditor.status_bar_disabled')
            }));
        }

        Ext.DomHelper.append(wrapper,{
            tag: 'span',
            style: 'clear: both'
        });
    }

    ,registerAce: function() {
        this.editor = ace.edit(Ext.DomQuery.selectNode('div.content-md'));
        this.editor.setOptions({
            maxLines: Infinity,
            minLines: 25,
            enableBasicAutocompletion: true,
            printMargin: false,
            showGutter: parseInt(MODx.config['markdowneditor.general.show_gutter'] || 1) == 1,
            fontSize: parseInt(MODx.config['markdowneditor.general.font_size']) || 12,
            fontFamily: MODx.config['markdowneditor.general.font_family'] || ''
        });
        this.editor.getSession().setUseWrapMode(true);
        this.editor.getSession().setWrapLimitRange();
        this.editor.renderer.setScrollMargin(10, 10);
        this.editor.getSession().setValue(this.textarea.getValue());
        this.editor.getSession().setMode("ace/mode/markdown");
        this.editor.setTheme("ace/theme/" + (MODx.config['markdowneditor.general.theme'] || 'monokai'));

        var langTools = ace.require("ace/ext/language_tools");
        var resourcesCompleter = {
            getCompletions: function(editor, session, pos, prefix, callback) {
                if (prefix.length === 0) { callback(null, []); return }

                MODx.Ajax.request({
                    url: markdownEditor.config.connectorUrl
                    ,params: {
                        action: 'mgr/resource/getlist'
                        ,prefix: prefix
                    },
                    listeners: {
                        'success': {
                            fn: function(r) {
                                callback(null, r.results);
                            },
                            scope: this
                        }
                    }
                });

            }
        };
        langTools.addCompleter(resourcesCompleter);


        this.editor.container.addEventListener("dragenter", this.catchAndDoNothing, false);
        this.editor.container.addEventListener("dragover", this.catchAndDoNothing, false);
        this.editor.container.addEventListener("drop", this.drop.bind(this), false);
    }

    ,registerMarked: function() {
        this.remarkable = new Remarkable({
            html: true,
            highlight: function (str, lang) {
                var value = '';
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        value = hljs.highlight(lang, str).value;

                        value = value.replace(/\[\[/g, '&#91;&#91;');
                        value = value.replace(/]]/g, '&#93;&#93;');

                        return value;
                    } catch (err) {}
                }

                try {
                    value = hljs.highlightAuto(str).value;

                    value = value.replace(/\[\[/g, '&#91;&#91;');
                    value = value.replace(/]]/g, '&#93;&#93;');

                    return value;
                } catch (err) {}

                return '';
            }
        });
        this.remarkable.inline.ruler.disable([ 'backticks' ]);
    }

    ,parse: function(input) {
        var output = this.remarkable.render(input);

        output = output.replace(/%5B/g, '[');
        output = output.replace(/%5D/g, ']');

        if (MODx.config['markdowneditor.lp.parse_modx_tags'] == 1) {
            if (this.parseRequest) {
                clearTimeout(this.parseRequest);
            }

            var timeout = parseInt(MODx.config['markdowneditor.lp.parse_modx_tags_timeout'] || 300);

            this.parseRequest = setTimeout(function(){
                MODx.Ajax.request({
                    url: markdownEditor.config.connectorUrl
                    ,params: {
                        action: 'mgr/editor/processcontent'
                        ,content: output
                        ,resource: MODx.request.id
                    },
                    isUpload : true,
                    listeners: {
                        'success': {
                            fn: function(r) {
                                this.preview.update(r.data);

                                if (this.fullScreen == true) {
                                    if ((this.editor.getCursorPosition().row + 2) >= this.editor.getSession().getScreenLength()) {
                                        this.preview.dom.scrollTop = this.preview.dom.scrollHeight
                                    }
                                }
                            },
                            scope: this
                        }
                    }
                });
            }.bind(this), timeout);
        } else {
            this.preview.update(output);

            if (this.fullScreen == true) {
                if ((this.editor.getCursorPosition().row + 2) >= this.editor.getSession().getScreenLength()) {
                    this.preview.dom.scrollTop = this.preview.dom.scrollHeight
                }
            }
        }

        this.taMarkdown.dom.value = this.editor.getValue();
        this.textarea.dom.value = output;

        return output;
    }

    ,catchAndDoNothing: function(e) {
        e.stopPropagation();
        e.preventDefault();
    }

    ,drop: function(e) {
        e.stopPropagation();
        e.preventDefault();

        if (MODx.config['markdowneditor.upload.enable_image_upload'] == 1 || MODx.config['markdowneditor.upload.enable_file_upload'] == 1) {
            this.handleFiles(e.dataTransfer.files);
        }
    }

    ,handleFiles: function(files, mobile) {
        mobile = mobile || 0;

        Ext.each(files, function(file) {
            var isImage = /^image\//.test(file.type);

            if (isImage) {
                if (MODx.config['markdowneditor.upload.enable_image_upload'] == 0) return true;

                if (!this.checkType(MODx.config['markdowneditor.upload.image_types'], file)){
                    this.failMessage(file, 'image', _('markdowneditor.err.upload.unsupported_image'));

                    return true;
                }

                if (file.size > parseInt(MODx.config['markdowneditor.upload.max_size'])) {
                    this.failMessage(file, 'image', _('markdowneditor.err.upload.too_big'));

                    return true;
                }

                if (MODx.config['markdowneditor.cropper.enable_cropper'] == 1) {
                    MODx.load({
                        xtype: 'markdowneditor-window-cropper'
                        ,file: file
                        ,md: this
                        ,mobile: mobile
                    }).show();
                } else {
                    this.uploadFile(file, 'image', mobile);
                    this.editor.focus();
                }
            } else {
                if (MODx.config['markdowneditor.upload.enable_file_upload'] == 0) return true;

                if (!this.checkType(MODx.config['markdowneditor.upload.file_types'], file)) {
                    this.failMessage(file, 'file', _('markdowneditor.err.upload.unsupported_file'));

                    return true;
                }

                if (file.size > parseInt(MODx.config['markdowneditor.upload.max_size'])) {
                    this.failMessage(file, 'file', _('markdowneditor.err.upload.too_big'));

                    return true;
                }

                this.uploadFile(file, 'file');
                this.editor.focus();
            }

        }, this);
    }

    ,checkType: function(allowedTypes, file) {
        allowedTypes = allowedTypes.split(',');

        return allowedTypes.indexOf(file.name.split('.').pop()) != -1;
    }

    ,uploadFile: function(file, type, mobile) {
        type = type || 'file';
        mobile = mobile || 0;

        var uploader = this.createUploader();

        var formData = new FormData();
        formData.append('file', file);
        formData.append('action', 'mgr/editor/' + type + 'upload');
        formData.append('name', file.name);
        formData.append('resource', this.config.resource);
        formData.append('mobile', mobile);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', markdownEditor.config.connectorUrl);
        xhr.setRequestHeader('Powered-By', 'MODx');
        xhr.setRequestHeader('modAuth', Ext.Ajax.defaultHeaders.modAuth);

        xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
                var complete = (event.loaded / event.total * 100 | 0);
                uploader.child('.progress').setWidth(complete + '%');
            }
        }.bind(this);

        xhr.onload = function () {
            if (xhr.status === 200) {
                var res = JSON.parse(xhr.responseText);
                if (res.success == true) {
                    uploader.remove();
                    var imagePrefix = (type == 'image') ? '!' : '';
                    var endLine = (type == 'image') ? '\n\n' : '\n';
                    this.editor.insert(imagePrefix + '[' + res.object.name + '](' + res.object.path + ' "' + res.object.name + '")' + endLine);
                } else {
                    this.failUploader(uploader, res.message);
                }
            }
        }.bind(this);

        xhr.send(formData);
    }

    ,createUploader: function(type, fileName) {
        var uploader = Ext.DomHelper.insertFirst(this.statusBar,{
            tag: 'div',
            html: '<div class="progress"><i class="icon icon-spinner icon-spin"></i> <span>' + _('markdowneditor.uploading_' + type) + fileName + '</span></div>'
        });

        return Ext.get(uploader);
    }

    ,failUploader: function(uploader, message) {
        uploader.child('.progress').addClass('error');
        uploader.child('.progress').setWidth('100%');

        uploader.child('i').addClass('remove-message');
        uploader.child('i').replaceClass('icon-spinner', 'icon-remove');
        uploader.child('i').removeClass('icon-spin');

        uploader.child('span').dom.innerHTML += ' failed. ' + message;
        uploader.child('.remove-message').on('click', function() {
            uploader.remove();
        });
    }

    ,failMessage: function(file, type, message) {
        var uploader = this.createUploader(type, file.name);
        this.failUploader(uploader, message);
    }

    ,isMobileDevice: function() {
        return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
    }
});

MODx.loadRTE = function(id) {
    new markdownEditor.Editor();
};
