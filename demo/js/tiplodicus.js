;(function ($, window, document, undefined) {
    var pluginName = 'tiplodicus',
        idNumber = 1,
        defaults = {
            containerId: 'tiplodicus',
            tooltipPosition: 'topCenter',
            leftOffset: 0,
            rightOffset: 0,
            topOffset: 0,
            bottomOffset: 0,
            showClass: 'show',
            showEvent: 'mouseover.td mouseout.td'
        };

    function Plugin(element, options) {
        this.el = element;
        this.$el = $(this.el);
        this.elData = {
            'top': this.$el.offset().top,
            'left': this.$el.offset().left,
            'height': this.$el.outerHeight(),
            'width': this.$el.outerWidth()
            };

        var dataOptions = this.$el.data('td-options');

        if (dataOptions) {
            options = $.extend({}, options, dataOptions);
        }

        this.options = $.extend({}, defaults, options);

        if (options && options.showEvent) {
            /**
                This is to so the user can set all tooltips to click and then individidually
                set some to hover or vice versa. It's also so the user doesn't have to worry
                about event namespacing and can just set 'click' or 'hover'.
            **/
            this.options['showEvent'] = options.showEvent === 'click' ? 'click.td' : 'mouseover.td mouseout.td';
        }

        this._name = pluginName;

        this.init();
    }

    Plugin.prototype.init = function () {
        
        this.options.tipTxt = this.$el.attr('title');

        this.$el.on(this.options.showEvent, {self: this}, this.tooltipActions);

        $.data(this.el, 'tooltipiId', idNumber);

        this.createTooltip();
    };

    Plugin.prototype.createTooltip = function() {
        var $tooltip = $('<div>', {'id': this.options.containerId + '-' + $.data(this.el, 'tooltipiId'), 'class': this.options.tooltipPosition}),
            $tipTxt = $('<p>', {'class': 'td-text', 'text': this.options.tipTxt}),
            $tip = $('<span>', {'class': 'td-tip'});

        this.$el.removeAttr('title');
        this.$tooltip = $tooltip.append([$tipTxt, $tip]);

        $('body').append(this.$tooltip);
        
        this.$tooltip.width = this.$tooltip.outerWidth(true);
        this.$tooltip.height = this.$tooltip.outerHeight(true);

        this.$tooltip.css(this[this.options.tooltipPosition + 'Align']());
    };

    Plugin.prototype.tooltipActions = function (e) {
        var self = e.data.self,
            $tooltip = $('#tiplodicus-' + $.data(e.currentTarget, 'tooltipiId'));

        

        if (e.type === 'mouseover') {
            self.reset();
            self.show();
        } else if (e.type === 'mouseout') {
            self.hide();
        } else if (e.type === 'click') {
            e.preventDefault();

            if ($tooltip.is(':hidden')) {
                self.reset();
                self.show();
            } else {
                self.hide();
            }
        }
    };

    Plugin.prototype.reset = function () {
        $('[id^="' + this.options.containerId + '"], [id*=" ' + this.options.containerId + '"]').removeClass('show');
    };

    Plugin.prototype.show = function () {
        this.$tooltip.addClass(this.options.showClass);
    };

    Plugin.prototype.hide = function () {
        this.$tooltip.removeClass(this.options.showClass);
    };

    Plugin.prototype.toggle = function() {
        this.$tooltip.toggleClass(this.options.showClass);
    };

    Plugin.prototype.destroy = function () {
        this.$el.off(this.options.showEvent);
        this.$tooltip.remove();
    };

    Plugin.prototype.topCenterAlign = function () {
        var coords = {
                        'left': this.getVertCenter(),
                        'top': this.getTop()
                     };

        return coords;
    };

    Plugin.prototype.bottomCenterAlign = function () {
        var coords = {
                        'left': this.getVertCenter(),
                        'top': this.getBottom()
                     };

        return coords;
    };

    Plugin.prototype.topRightAlign = function () {
        var coords = {
                        'left': this.getRight(),
                        'top': this.getTop()
                     };

        return coords;
    };

    Plugin.prototype.bottomRightAlign = function () {
        var coords = {
                        'left': this.getRight(),
                        'top': this.getBottom()
                     };

        return coords;
    };

    Plugin.prototype.topLeftAlign = function () {
        var coords = {
                        'left': this.getLeft(),
                        'top': this.getTop()
                     };

        return coords;
    };

    Plugin.prototype.bottomLeftAlign = function () {
        var coords = {
                        'left': this.getLeft(),
                        'top': this.getBottom()
                     };

        return coords;
    };

    Plugin.prototype.rightCenterAlign = function() {
        var coords = {
                        'left': this.getRight(),
                        'top': this.getHorizCenter()
                     };

        return coords;
    };

    Plugin.prototype.leftCenterAlign = function() {
        var coords = {
                        'left': this.getLeft(),
                        'top': this.getHorizCenter()
                     };

        return coords;
    };

    Plugin.prototype.getVertCenter = function() {
        return (this.elData.left + (this.elData.width / 2)) - (this.$tooltip.width / 2);
    };

    Plugin.prototype.getHorizCenter = function() {
        return this.elData.top - (this.$tooltip.height / 2) + (this.elData.height / 2);
    };

    Plugin.prototype.getTop = function () {
        return this.elData.top - this.options.bottomOffset - this.$tooltip.height;
    }

    Plugin.prototype.getBottom = function () {
        return this.elData.top + this.elData.height + this.options.topOffset;
    }

    Plugin.prototype.getRight = function() {
        return this.elData.left + this.options.rightOffset + this.elData.width;
    };

    Plugin.prototype.getLeft = function() {
        return this.elData.left - this.options.leftOffset - this.$tooltip.width;
    };


    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName,
                new Plugin(this, options));
            } else if ($.isFunction(Plugin.prototype[options])) {
                $.data(this, 'plugin_' + pluginName)[options]();
            }

            idNumber += 1;
        });
    };

})(jQuery, window, document);