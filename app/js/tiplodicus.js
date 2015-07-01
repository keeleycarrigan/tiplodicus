;(function ($, window, document, undefined) {
    var pluginName = 'tiplodicus',
        isIE8 = !+'\v1',
        docEvtAttached = false,
        $win = $(window),
        extObj = {}, // Object used to extend jQuery's pseudo selector.
        defaults = {
            containerClass: 'tiplodicus',
            containerModifier: '',
            containerAttrs: '',
            contentClass: 'td-content',
            contentModifier: '',
            closeBtn: 'X',
            closeBtnClass: 'td-close',
            closeBtnAttrs: 'data-close-tip',
            closeTrigger: '[data-close-tip]',
            includeCloseBtn: true,
            tipClass: 'td-tip',
            dataOptName: 'td-options',
            origin: 'element',
            vertical: 'top',
            horizontal: 'center',
            offset: {x: 0, y: 10},
            customWrapEl: 'tip-el', // Custom elements must have a '-'
            showClass: 'show',
            hideClass: 'hide',
            ajaxSettings: {},
            ajaxContext: null,
            contentSrc: 'title',
            customContent: false,
            tipTemplate: null,
            txtTag: 'p',
            removeTitle: true,
            clickThrough: false,
            cursorOffset: 5,
            clickOutsideToHide: true,
            keepOpen: false,
            isOpen: false,
            showEvent: 'hover',
            addTip: true,
            evtNamespace: 'td',
            thereCanOnlyBeOne: true,
            onInit: $.noop,
            onCreate: $.noop,
            onOpen: $.noop,
            onClose: $.noop
        },
        linkRegEx = /\[([^\]]+)\]\(([^)"]+)(?: \"([^\"]+)\")?\)/g,
        isTouchDevice = (function () {
            return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
        })(),
        isPluginType = function (el) {
            return typeof($(el).data('plugin_' + pluginName)) === 'object';
        },
        getTrueValue = function (val) {
            if (isNaN(parseInt(val, 10))) {
                switch (val) {
                case 'null':
                    return null;
                    break;
                case 'true':
                    return true;
                    break;
                case 'false':
                    return false;
                    break;
                case 'undefined':
                    return undefined;
                    break;
                default:
                    return val;
                    break;    
                }
            }

            return parseInt(val, 10);
        };

    extObj[pluginName] = function (el, index, meta) {
        if (meta[3] && isPluginType(el)) {
            var inputOpts = meta[3].split(':'),
                pluginOpts = $.data(el, 'plugin_' + pluginName)['options'][inputOpts[0]];

            if (inputOpts.length > 1) {
                return pluginOpts === getTrueValue(inputOpts[1]);
            } else {
                return pluginOpts;
            }
        } else {
            return isPluginType(el);    
        }
    };

    $.extend($.expr[':'], extObj);

    function Plugin(element, options) {
        options = options || {};
        this.el = element;
        this.$el = $(this.el);
        this.fullWidth = false;
        this.options = $.extend({}, defaults, options);

        var dataOptions = this.$el.data(this.options.dataOptName) || {},
            savedOffsets = defaults.offset;

        this.options = $.extend({}, this.options, dataOptions);

        // This allows the user to only pass X or Y if they choose.
        if (typeof(options.offset) !== undefined || typeof(dataOptions.offset) !== undefined) {
            var newOffset = options.offset || dataOptions.offset;

            this.options.offset = $.extend({}, savedOffsets, newOffset);
        }

        this._name = pluginName;

        this.init();
    }

    Plugin.prototype = {
        init: function () {
            /**
                This is to so the user can set all tooltips to click and then individidually
                set some to hover or vice versa. It's also so the user doesn't have to worry
                about event namespacing and can just set 'click' or 'hover'.
            **/
            var self = this,
                attachedEvents = self.options.showEvent === 'click' ? 'click.' + self.options.evtNamespace : 'mouseenter.' + self.options.evtNamespace + ' mouseleave.' + self.options.evtNamespace + ' click.' + self.options.evtNamespace,
                tipNodes = '';

            if (isTouchDevice) {
                self.options.showEvent = 'click';
                self.options.origin = 'element';
                attachedEvents = 'touchstart.' + self.options.evtNamespace;
            }

            self.options.onInit(self);
            self.buildTooltip();

            if (self.$el.html().indexOf(' ') > -1) {
                var text = self.$el.html().split(' '),
                    wraps = '<' + self.options.customWrapEl + '>' + text.join('</' + self.options.customWrapEl + '> <' + self.options.customWrapEl + '>') + '</' + self.options.customWrapEl + '>';

                self.$el.html(wraps);
            }

            if (self.options.clickOutsideToHide && self.options.showEvent === 'click' && !docEvtAttached) {
                docEvtAttached = true;

                $(document).on('click.tip-close touchstart.tip-close', function (e) {
                    $(':' + pluginName + '("isOpen")')[pluginName]('dismiss', [e]);
                });
            }

            if (isIE8) {
                // This is so IE8 will recognize the custom elements.
                document.createElement(self.options.customWrapEl);
            }

            this.$el.on(attachedEvents, {self: self}, self.tooltipActions);
        },
        setHideTimer: function () {
            var self = this,
                delay = self.options.keepOpen ? 500 : 200;

            self.keepOpenTimer = setTimeout(function () {
                self.hide();
            }, delay);
        },
        keepOpenCheck: function (e) {
            var self = e.data.self;

            if (e.type === 'mouseenter') {
                clearTimeout(self.keepOpenTimer);
            } else {
                self.setHideTimer();
            }
        },
        formatLinks: function (txt) {
            var allLinks = txt.match(linkRegEx),
                numLinks;

            if (allLinks) {
                numLinks = allLinks.length;

                for (var i = 0; i < numLinks; i += 1) {
                    linkRegEx.lastIndex = 0;
                    var linkInfo = linkRegEx.exec(allLinks[i]);
                        link = '<a href="' + linkInfo[2] + '">' + linkInfo[1] + '</a>';

                    txt = txt.replace(allLinks[i], link);
                }
            }

            return txt;
            
        },
        formatTxt: function (txt, txtTag) {
            var lineBreaks = txt.replace(/(\\(?=n)n+)+|\n+/g, '|').split('|');

            return this.formatLinks('<' + txtTag + '>' + lineBreaks.join('</' + txtTag + '><' + txtTag + '>') + '</' + txtTag + '>');
        },
        getContent: function () {
            var content = null;

            if (this.options.contentSrc === 'ajax') {
                var srcUrl = this.$el.attr('href'),
                    customSettings = $.extend({url: srcUrl}, this.options.ajaxSettings);

                if (srcUrl.indexOf('#') > 0) {
                    this.options.ajaxContext = '#' + srcUrl.split('#').slice(1).join(', #');
                }

                return $.ajax(customSettings);
            } else {
                content = this.options.customContent ? this.options.customContent : this.formatTxt(this.$el.attr(this.options.contentSrc), this.options.txtTag);

                if (this.options.contentSrc === 'title' || this.options.removeTitle) {
                    this.savedTitle = this.$el.attr('title');
                    this.$el.removeAttr('title');
                }

                return content;
            }
        },
        processCustomTemplate: function (html) {
            this.$tooltip = $(html).addClass(this.options.containerModifier + ' ' + this.currentPosClass);
            this.$content = this.$tooltip.find('.' + this.options.contentClass);
            this.$tip = this.$tooltip.find('.' + this.options.tipClass);
        },
        attachEvents: function () {
            this.$tooltip.on('click', this.options.closeTrigger, {self: this}, this.hide);

            if (this.options.keepOpen) {
                this.$tooltip.on('mouseenter.' + this.options.evtNamespace + ' mouseleave.' + this.options.evtNamespace, {self: this}, this.keepOpenCheck);
            }
        },
        buildCheck: function () {
            var self = this,
                checker = setInterval(function () {
                    if (self.tipBuilding === 'done') {
                        if (self.$content.find('a').not('.' + self.options.closeBtnClass).length > 0) {
                            self.options.keepOpen = true;
                        }
                        self.attachEvents();
                        self.detectCollision(self.setTargetBounds(self.options.origin, self.$el), self.options.vertical, self.options.horizontal);
                        self.options.onCreate(self);
                        clearInterval(checker);
                    }
                }, 100);
        },
        buildContent: function () {
            var content = this.getContent(),
                self = this;

            if (typeof(content.success) === 'function') {
                content
                .done(function (data) {
                    var ajaxContent;

                    if (self.options.ajaxContext) {
                        ajaxContent = $(data).find(self.options.ajaxContext);

                        if (ajaxContent.length < 1) {
                            ajaxContent = $(data).filter(self.options.ajaxContext);
                        }
                    } else {
                        ajaxContent = data;
                    }

                    self.$content.append(ajaxContent);
                })
                .fail(function () {
                    self.$content.append('<p>Request Failed</p>');
                })
                .always(function () {
                    self.tipBuilding = 'done';
                });

            } else {
                self.$content.append(content);
                self.tipBuilding = 'done';
            }
        },
        buildTooltip: function () {
            this.tipBuilding = 'pending';
            this.currentPosClass = this.options.vertical + '-' + this.options.horizontal;

            if (this.options.contentSrc === 'inline') {
                this.processCustomTemplate(this.$el.attr('href'));
                this.tipBuilding = 'done';
            } else {
                if (this.options.tipTemplate) {
                    this.processCustomTemplate(this.options.tipTemplate);
                } else {
                    var $tipClose = this.options.includeCloseBtn ? '<a href="#" class="' + this.options.closeBtnClass + '" ' + this.options.closeBtnAttrs + '>' + this.options.closeBtn + '</a>' : null;
                    
                    this.$tip = this.options.addTip ? $('<span>', {'class': this.options.tipClass}) : null;
                    this.$content = $('<div>', {'class': this.options.contentClass + ' ' + this.options.containerModifier});
                    this.$tooltip = $('<div class="' + this.options.containerClass + ' ' + this.options.hideClass + ' ' + this.currentPosClass + '" ' + this.options.containerAttrs + '></div>');
                }

                $('body').append(this.$tooltip.append([this.$content.append($tipClose), this.$tip]));
                this.buildContent();
            }
            
            this.defaultClasses = this.$tooltip.attr('class');
            this.buildCheck();
        },
        getAlignment: function (origin, vert, horiz) {
            var horizontal = horiz === 'center' ? 'horizCenter' : horiz,
                vertical = vert === 'center' ? 'vertCenter' : vert,
                xModify = vert === 'center' ? -1 : 1,
                tipHeight = this.$tooltip.outerHeight(true),
                tipWidth = this.$tooltip.outerWidth(true),
                align = {},
                getPos = {
                    horizCenter: function() {
                        return origin.center.x - (tipWidth / 2);
                    },
                    vertCenter: function() {
                        return origin.center.y - (tipHeight / 2);
                    },
                    top: function () {
                        return Math.round((origin.top - this.options.offset.y) - tipHeight);
                    },
                    bottom: function () {
                        return Math.round(origin.bottom + this.options.offset.y);
                    },
                    right: function() {
                        return Math.round(origin.right + (this.options.offset.x * xModify));
                    },
                    left: function() {
                        return Math.round((origin.left - (this.options.offset.x * xModify)) - tipWidth);
                    }
                };

                // When the tooltip is 100% position it off the edge of the screen.
                align['left'] = this.fullWidth ? 0 : getPos[horizontal].apply(this);
                align['top'] = getPos[vertical].apply(this);

            return [align, vert, horiz];
        },
        detectCollision: function (origin, vert, horiz) {
            var winHeight = $win.height(),
                winWidth = $win.width(),
                winTop = $win.scrollTop(),
                tipHeight = this.$tooltip.outerHeight(true),
                tipWidth = this.$tooltip.outerWidth(true),
                activeTop = origin.top - winTop,
                activeRight = winWidth - origin.right,
                activeLeft = origin.left,
                activeBottom = winHeight - (origin.bottom - winTop),
                posClass,
                oldPos;

            if (tipWidth === $win.width()) {
                this.fullWidth = true;
                // Make sure tooltip's vertical is either top or bottom on 100% width.
                vert = vert !== 'bottom' ? 'top' : 'bottom';
                horiz = 'center';
            } else {
                this.fullWidth = false;

                if (horiz === 'left' && activeLeft < tipWidth && activeRight > tipWidth) {
                    horiz = 'right';
                } else if (horiz === 'right' && activeRight < tipWidth && activeLeft > tipWidth) {
                    horiz = 'left';
                } else if (horiz === 'center' && (activeLeft < (tipWidth / 2) || activeRight < (tipWidth / 2))) {
                    if (activeLeft < (tipWidth / 2)) {
                        horiz = 'right';
                    } else if (activeRight < (tipWidth / 2)) {
                        horiz = 'left';
                    }
                }
            }

            if (vert === 'top' && activeTop < tipHeight && activeBottom > tipHeight) {
                vert = 'bottom';
            } else if (vert === 'bottom' && activeBottom < tipHeight && activeTop > tipHeight) {
                vert = 'top';
            } else if (vert === 'center' && (activeTop < (tipHeight / 2) || activeBottom < (tipHeight / 2))) {
                if  (activeTop < (tipHeight / 2)) {
                    vert = 'bottom';
                } else if (activeBottom < (tipHeight / 2)) {
                    vert = 'top';
                }
            }

            posClass = vert + '-' + horiz;

            if (this.currentPosClass !== posClass) {
                oldPos = this.currentPosClass;
                this.currentPosClass = posClass;
            }

            this.$tooltip.removeClass(oldPos).addClass(this.currentPosClass);

            return [origin, vert, horiz];
        },
        positionTip: function (origin) {
            this.$tip.css({'left': origin.center.x});
        },
        position: function (origin) {
            var position = this.getAlignment.apply(this , this.detectCollision(origin, this.options.vertical, this.options.horizontal));

            if (this.fullWidth) {
                this.positionTip(origin);
            } else {
                this.$tip.removeAttr('style');
            }

            // // Reset the style attribute for repositioning if needed.
            this.$tooltip.removeAttr('style').css(position[0]);
        },
        setTargetBounds: function (origin, target) {
            var bounds = {
                    'top': 0,
                    'right': 0,
                    'bottom': 0,
                    'left': 0,
                    'center': {x: 0, y: 0}
                };

            if (origin === 'cursor') {
                bounds.top = target.pageY - this.options.cursorOffset;
                bounds.right = target.pageX + this.options.cursorOffset;
                bounds.bottom = target.pageY + this.options.cursorOffset;
                bounds.left = target.pageX - this.options.cursorOffset;
                bounds.center.x = target.pageX;
                bounds.center.y = target.pageY;
            } else {
                var offsetTop = Math.round(target.offset().top),
                    offsetLeft = Math.round(target.offset().left),
                    width = target.outerWidth(true),
                    height = target.outerHeight(true);

                bounds.top = offsetTop;
                bounds.right = offsetLeft + width;
                bounds.bottom = offsetTop + height;
                bounds.left = offsetLeft;
                bounds.center.x = offsetLeft + (width / 2);
                bounds.center.y = offsetTop + (height / 2);
            }

            return bounds;
        },
        checkWordWrap: function ($target) {
            if (this.$el.height() !== $target.height()) {
                return true;
            }

            return false;
        },
        tooltipActions: function (e) {
            e.stopPropagation();

            var self = e.data.self,
                target,
                targetBounds;

            if (self.options.origin === 'cursor') {
                target = e;
            } else {
                if (self.checkWordWrap($(e.target))) {
                    target = $(e.target);
                } else {
                    target = self.$el;
                }
            }

            targetBounds = self.setTargetBounds(self.options.origin, target);

            if (e.type === 'mouseenter') {
                clearTimeout(self.keepOpenTimer);
                self.show(targetBounds);
            } else if (e.type === 'mouseleave') {
                self.setHideTimer();
            } else if (e.type === 'click' || e.type === 'touchstart') {
                if (!self.options.clickThrough || self.options.showEvent === 'click') {
                    e.preventDefault();
                }

                if (self.options.showEvent === 'click') {
                    if (self.options.isOpen) {
                        self.hide();
                    } else {
                        self.show(targetBounds);
                    }
                }
            }
        },
        dismiss: function (e) {
            /**
            *   This is purely to stop click/touch events from bubbling so
            *   content inside the tooltip can be clicked and not close it.
            **/
            if ($(e.target).parents('.' + this.options.containerClass).length > 0) {
                e.stopPropagation();
            } else {
                this.hide();
            }
        },
        reset: function () {
            $(':' + pluginName + '("isOpen")')[pluginName]('hide');
        },
        show: function (origin) {
            if (this.options.thereCanOnlyBeOne) {
                this.reset();
            }
            this.position(origin);
            this.$tooltip.addClass(this.options.showClass).removeClass(this.options.hideClass);
            this.options.onOpen(this);
            this.options.isOpen = true;
        },
        hide: function (e) {
            var self = this;

            if (e) {
                e.preventDefault();
                self = e.data.self;
            }

            self.$tooltip.removeClass(self.options.showClass).addClass(self.options.hideClass);
            self.options.onClose(this);
            self.options.isOpen = false;
        },
        destroy: function () {
            this.$el.off(this.options.showEvent);
            this.$tooltip.remove();

            if (this.savedTitle) {
                this.$el.attr('title', this.savedTitle);
            }
        }
    };

    $.fn[pluginName] = function (options, args) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
            } else if ($.isFunction(Plugin.prototype[options]) && options.indexOf('_') < 0) {
                // Possibly be refactored, but allows passing multiple arguments to methods
                var thePlugin = $.data(this, 'plugin_' + pluginName);
                // So IE8 doesn't freak out if you don't pass anything to apply as an argument.
                args = args || [];

                thePlugin[options].apply(thePlugin, args);
            }
        });
    };

})(jQuery, window, document);
