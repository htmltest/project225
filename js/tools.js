$(document).ready(function() {

    $.validator.addMethod('phoneRU',
        function(phone_number, element) {
            return this.optional(element) || phone_number.match(/^\+7 \(\d{3}\) \d{3}\-\d{2}\-\d{2}$/);
        },
        'Ошибка заполнения'
    );

    $.validator.addMethod('codeSMS',
        function(sms, element) {
            return this.optional(element) || sms.match(/^\d{4}$/);
        },
        'Ошибка заполнения'
    );

    $.validator.addMethod('inputDate',
        function(curDate, element) {
            if (this.optional(element) && curDate == '') {
                return true;
            } else {
                if (curDate.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/)) {
                    var userDate = new Date(curDate.substr(6, 4), Number(curDate.substr(3, 2)) - 1, Number(curDate.substr(0, 2)));
                    if ($(element).attr('min')) {
                        var minDateStr = $(element).attr('min');
                        var minDate = new Date(minDateStr.substr(6, 4), Number(minDateStr.substr(3, 2)) - 1, Number(minDateStr.substr(0, 2)));
                        if (userDate < minDate) {
                            $.validator.messages['inputDate'] = 'Минимальная дата - ' + minDateStr;
                            return false;
                        }
                    }
                    if ($(element).attr('max')) {
                        var maxDateStr = $(element).attr('max');
                        var maxDate = new Date(maxDateStr.substr(6, 4), Number(maxDateStr.substr(3, 2)) - 1, Number(maxDateStr.substr(0, 2)));
                        if (userDate > maxDate) {
                            $.validator.messages['inputDate'] = 'Максимальная дата - ' + maxDateStr;
                            return false;
                        }
                    }
                    return true;
                } else {
                    $.validator.messages['inputDate'] = 'Дата введена некорректно';
                    return false;
                }
            }
        },
        ''
    );

    $('form').each(function() {
        initForm($(this));
    });

    $('body').on('click', '.form-input-clear', function(e) {
        var curField = $(this).parents().filter('.form-input');
        curField.find('input').val('').trigger('focus').addClass('focus');
        e.preventDefault();
    });

    $('.auth-form form').each(function() {
        var timerNewSMS = null;
        var curTimeNewSMS = 0;

        $('.auth-form form').each(function() {
            var curForm = $(this);
            var validator = curForm.validate();
            validator.destroy();
            curForm.validate({
                ignore: '',
                submitHandler: function(form) {
                    var curData = curForm.serialize();
                    curForm.find('.form-input input').prop('disabled', true);
                    curForm.find('.form-submit button').prop('disabled', true).addClass('loading');
                    curForm.find('label.error').remove();
                    $.ajax({
                        type: 'POST',
                        url: curForm.attr('data-urlCheckPhone'),
                        dataType: 'json',
                        data: curData,
                        cache: false,
                        timeout: 30000
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        curForm.find('.form-input input').prop('disabled', false);
                        curForm.find('.form-submit button').prop('disabled', false).removeClass('loading');
                        curForm.find('.form-input input').after('<label class="error">Сервис временно недоступен, попробуйте позже.</label>');
                    }).done(function(data) {
                        curForm.find('.form-input input').prop('disabled', false);
                        curForm.find('.form-submit button').prop('disabled', false).removeClass('loading');
                        if (data.status) {
                            if (typeof(data.needRegistration) != 'undefined' && data.needRegistration) {
                                window.location = curForm.attr('data-urlRegistration');
                            } else {
                                $('#auth-phone').removeClass('visible');
                                $('.auth-code-text span').html(curForm.find('.form-input input').val());
                                $('#auth-code').addClass('visible');
                                $('.auth-code-form .form-input input').val('').prop('disabled', false).trigger('focus');
                                $('.auth-code-form .form-input').removeClass('loading');
                                curTimeNewSMS = data.timeNewSMS;
                                $('.auth-code-new').html($('.auth-code-new').attr('data-default') + ' ' + curTimeNewSMS + ' ' + getSecondsText(curTimeNewSMS));
                                timerNewSMS = window.setInterval(function() {
                                    curTimeNewSMS--;
                                    if (curTimeNewSMS == 0) {
                                        window.clearInterval(timerNewSMS);
                                        timerNewSMS = null;
                                        $('.auth-code-new').html('<a href="' + data.linkNewSMS + '">' + $('.auth-code-new').attr('data-newlink') + '</a>');
                                    } else {
                                        $('.auth-code-new').html($('.auth-code-new').attr('data-default') + ' ' + curTimeNewSMS + ' ' + getSecondsText(curTimeNewSMS));
                                    }
                                }, 1000);
                            }
                        } else {
                            curForm.find('.form-input input').after('<label class="error">' + data.errorMessage + '</label>');
                        }
                    });
                }
            });
        });

        $('.auth-code-form form').each(function() {
            var curForm = $(this);
            var validator = curForm.validate();
            validator.destroy();
            curForm.validate({
                ignore: '',
                submitHandler: function(form) {
                    if (!curForm.find('.form-input').hasClass('loading')) {
                        var curData = curForm.serialize();
                        curForm.find('.form-input input').prop('disabled', true).trigger('blur');
                        curForm.find('.form-input').addClass('loading');
                        curForm.find('label.error').remove();
                        $.ajax({
                            type: 'POST',
                            url: curForm.attr('data-urlCheckCode'),
                            dataType: 'json',
                            data: curData,
                            cache: false,
                            timeout: 30000
                        }).fail(function(jqXHR, textStatus, errorThrown) {
                            curForm.find('.form-input input').prop('disabled', false);
                            curForm.find('.form-input').removeClass('loading');
                            curForm.find('.form-input input').after('<label class="error">Сервис временно недоступен, попробуйте позже.</label>');
                        }).done(function(data) {
                            curForm.find('.form-input').removeClass('loading');
                            curForm.find('.form-input input').prop('disabled', false);
                            if (data.status) {
                                window.location = data.linkSuccess;
                            } else {
                                curForm.find('.form-input input').after('<label class="error">' + data.errorMessage + '</label>');
                            }
                        });
                    }
                }
            });
        });

        $('body').on('keyup', '.auth-code-form .form-input input', function() {
            $('.auth-code-form label.error').remove();
            if ($(this).val().length == 4) {
                $('.auth-code-form form').trigger('submit');
            }
        });

        $('.auth-back a').click(function(e) {
            window.clearInterval(timerNewSMS);
            timerNewSMS = null;

            $('#auth-phone').addClass('visible');
            $('#auth-code').removeClass('visible');
            $('.auth-form .form-input input').trigger('focus');

            e.preventDefault();
        });

        $('body').on('click', '.auth-code-new a', function(e) {
            var curForm = $('.auth-code-form form');
            if (!curForm.find('.form-input').hasClass('loading')) {
                var curData = $('.auth-form form').serialize();
                curForm.find('.form-input input').prop('disabled', true).trigger('blur');
                curForm.find('.form-input').addClass('loading');
                curForm.find('label.error').remove();
                $.ajax({
                    type: 'POST',
                    url: $('.auth-code-new a').attr('href'),
                    dataType: 'json',
                    data: curData,
                    cache: false,
                    timeout: 30000
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    curForm.find('.form-input input').prop('disabled', false).val('').trigger('focus');
                    curForm.find('.form-input').removeClass('loading');
                    curForm.find('.form-input input').after('<label class="error">Сервис временно недоступен, попробуйте позже.</label>');
                }).done(function(data) {
                    curForm.find('.form-input input').prop('disabled', false).val('').trigger('focus');
                    curForm.find('.form-input').removeClass('loading');
                    if (data.status) {
                        curTimeNewSMS = data.timeNewSMS;
                        $('.auth-code-new').html($('.auth-code-new').attr('data-default') + ' ' + curTimeNewSMS + ' ' + getSecondsText(curTimeNewSMS));
                        timerNewSMS = window.setInterval(function() {
                            curTimeNewSMS--;
                            if (curTimeNewSMS == 0) {
                                window.clearInterval(timerNewSMS);
                                timerNewSMS = null;
                                $('.auth-code-new').html('<a href="' + data.linkNewSMS + '">' + $('.auth-code-new').attr('data-newlink') + '</a>');
                            } else {
                                $('.auth-code-new').html($('.auth-code-new').attr('data-default') + ' ' + curTimeNewSMS + ' ' + getSecondsText(curTimeNewSMS));
                            }
                        }, 1000);
                    } else {
                        curForm.find('.form-input input').after('<label class="error">' + data.errorMessage + '</label>');
                    }
                });
            }
            e.preventDefault();
        });
    });

    $.validator.addMethod('birthday18',
        function(value, element) {
            return checkAge18(value);
        },
        'Возраст должен быть не менее 18 лет'
    );

    $('.birthday18').each(function() {
        var curInput = $(this);

        var today = new Date();

        var maxDate = new Date(today.getTime());
        maxDate.setFullYear(maxDate.getFullYear() - 18);

        curInput.data('datepicker').update({
            maxDate: maxDate
        });
    });

    $('.auth-code-not-link').click(function() {
        $(this).parent().toggleClass('open');
    });

    $(document).click(function(e) {
        if ($(e.target).parents().filter('.auth-code-not-container').length == 0) {
            $('.auth-code-not-container.open').removeClass('open');
        }
    });

    $('.registration-form-help-link').click(function() {
        $(this).parent().toggleClass('open');
    });

    $(document).click(function(e) {
        if ($(e.target).parents().filter('.registration-form-help-container').length == 0) {
            $('.registration-form-help-container.open').removeClass('open');
        }
    });

    $('.menu-mobile-link').click(function(e) {
        var curWidth = $(window).width();
        if (curWidth < 375) {
            curWidth = 375;
        }
        var curScroll = $(window).scrollTop();
        $('html').addClass('menu-mobile-open');
        $('meta[name="viewport"]').attr('content', 'width=' + curWidth);
        $('html').data('scrollTop', curScroll);
        e.preventDefault();
    });

    $(document).click(function(e) {
        if ($(e.target).hasClass('header-user-menu')) {
            if ($('html').hasClass('menu-mobile-open')) {
                $('html').removeClass('menu-mobile-open');
                $('meta[name="viewport"]').attr('content', 'width=device-width');
                $(window).scrollTop($('html').data('scrollTop'));
            }
        }
    });

    $('.tabs').each(function() {
        var curTabs = $(this);
        var menuHTML =  '<ul>';
        curTabs.find('.tabs-content').each(function() {
            menuHTML +=     '<li><a href="#">' + $(this).attr('data-title') + '</a></li>';
        });
        menuHTML +=     '</ul>';
        curTabs.find('.tabs-menu').html(menuHTML);
        curTabs.find('.tabs-menu li').eq(0).addClass('active');
        curTabs.find('.tabs-content').eq(0).addClass('active');
    });

    $('body').on('click', '.tabs-menu ul li a', function(e) {
        var curItem = $(this).parent();
        if (!curItem.hasClass('active')) {
            var curTabs = curItem.parents().filter('.tabs');
            curTabs.find('.tabs-menu ul li.active').removeClass('active');
            curItem.addClass('active');
            var curIndex = curTabs.find('.tabs-menu ul li').index(curItem);
            curTabs.find('.tabs-content.active').removeClass('active');
            curTabs.find('.tabs-content').eq(curIndex).addClass('active');
        }
        e.preventDefault();
    });

    $('.profile-edit-link').click(function(e) {
        var curInput = $(this).parents().filter('.form-input').find('input');
        curInput.prop('disabled', false).trigger('focus');
        curInput.attr('data-old', curInput.val());
        var curForm = curInput.parents().filter('.profile-section-form');
        curForm.addClass('editable');
        e.preventDefault();
    });

    $('.profile-section-form-cancel').click(function(e) {
        var curForm = $(this).parents().filter('.profile-section-form');
        curForm.find('input[data-old]').each(function() {
            var curInput = $(this);
            var curField = curInput.parents().filter('.form-input');
            curInput.val(curInput.attr('data-old'));
            curInput.prop('disabled', true).trigger('blur');
        });
        curForm.removeClass('editable');
        e.preventDefault();
    });

    $('.apps-close').click(function(e) {
        $('.apps').fadeOut(function() {
            $('.apps').remove();
        });
        e.preventDefault();
    });

    $('.main-polis-archive-link a').click(function(e) {
        $('.main-polis-archive-link').toggleClass('active');
        $('.archive-polises').slideToggle();
        e.preventDefault();
    });

    $('.notifications-item-close').click(function(e) {
        var curBlock = $(this).parent();
        curBlock.fadeOut(function() {
            curBlock.remove();
        });
        e.preventDefault();
    });

    $('.faq-item-title').click(function() {
        var curItem = $(this).parent();
        curItem.toggleClass('open');
        curItem.find('.faq-item-content').slideToggle();
    });
    
    $('.policy-pref-inner').click(function() {
        $('html, body').animate({'scrollTop': $('.policy-form').offset().top - 40});
    });

});

$.fn.datepicker.language['ru'] =  {
    days: ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
    daysShort: ['Вос','Пон','Вто','Сре','Чет','Пят','Суб'],
    daysMin: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
    months: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    monthsShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
    today: 'Сегодня',
    clear: 'Очистить',
    dateFormat: 'dd.mm.yyyy',
    timeFormat: 'hh:ii',
    firstDay: 1
};

function checkAge18(value) {
    var checkDate = new Date(value.replace(/(\d{2}).(\d{2}).(\d{4})/, '$3-$2-$1'));
    var nowDate = new Date();

    var ageCurrent = parseInt(yearsDiff(checkDate));

    if (ageCurrent < 18) {
        return false;
    }

    return true;
}

function yearsDiff(dt) {
    if (dt > new Date()) {
        return 0;
    }

    var crntDate = new Date();

    var yearDiff = parseInt(crntDate.getFullYear() - dt.getFullYear());

    var dat4check = new Date(dt);
    dat4check.setFullYear(crntDate.getFullYear());
    if (dat4check > crntDate) {
        yearDiff--;
    }

    if (yearDiff <= 0) {
        return 0;
    }

    if (yearDiff === 1) {
        var monthDiff = parseInt(crntDate.getMonth() - dt.getMonth());
        if (monthDiff >= 0) {
            if (monthDiff == 0) {
                var dayDiff = parseInt(crntDate.getDate() - dt.getDate());
                if (dayDiff > 0) {
                    return yearDiff;
                } else {
                    return 0;
                }
            } else {
                return crntDate.getFullYear() - dt.getFullYear();
            }
        } else {
            return 0;
        }
    } else {
        return yearDiff;
    }
}

function initForm(curForm) {
    curForm.find('input.phoneRU').attr('autocomplete', 'off');
    curForm.find('input.phoneRU').mask('+7 (000) 000-00-00');

    curForm.find('input.codeSMS').attr('autocomplete', 'off');
    curForm.find('input.codeSMS').mask('0000');

    curForm.find('.form-input-date input').mask('00.00.0000');
    curForm.find('.form-input-date input').attr('autocomplete', 'off');
    curForm.find('.form-input-date input').addClass('inputDate');

    curForm.find('.form-input input, .form-input textarea').each(function() {
        if ($(this).val() != '') {
            $(this).parent().addClass('full');
        }
    });

    curForm.find('.form-input input, .form-input textarea').focus(function() {
        $(this).parent().addClass('focus');
    });
    curForm.find('.form-input input, .form-input textarea').blur(function(e) {
        $(this).parent().removeClass('focus');
        if ($(this).val() == '') {
            $(this).parent().removeClass('full');
        } else {
            $(this).parent().addClass('full');
        }
        if (e.originalEvent !== undefined && $(e.originalEvent.relatedTarget).hasClass('form-input-clear')) {
            $(this).parent().find('.form-input-clear').trigger('click');
        }
    });

    curForm.find('input[autofocus]').trigger('focus');

    curForm.find('.form-select select').each(function() {
        var curSelect = $(this);
        var options = {
            minimumResultsForSearch: 10,
            closeOnSelect: false
        };
        if (typeof(curSelect.attr('data-searchplaceholder')) != 'undefined') {
            options['searchInputPlaceholder'] = curSelect.attr('data-searchplaceholder');
        }
        curSelect.select2(options);
        curSelect.parent().find('.select2-container').attr('data-placeholder', curSelect.attr('data-placeholder'));
        curSelect.on('select2:select', function(e) {
            $(e.delegateTarget).parent().find('.select2-container').addClass('select2-container--full');
            $(e.delegateTarget).parent().find('.select2-search--inline input').val('').trigger('input.search').trigger('focus');
            $(e.delegateTarget).parent().find('.select2-search--inline input').attr('placeholder', curSelect.attr('data-searchplaceholder'));
        });
        curSelect.on('select2:unselect', function(e) {
            if (curSelect.find('option:selected').length == 0) {
                $(e.delegateTarget).parent().find('.select2-container').removeClass('select2-container--full');
                $(e.delegateTarget).parent().find('.select2-search--inline input').attr('placeholder', curSelect.attr('data-placeholder'));
            } else {
                $(e.delegateTarget).parent().find('.select2-search--inline input').attr('placeholder', curSelect.attr('data-searchplaceholder'));
            }
        });
        if (typeof(curSelect.attr('multiple')) != 'undefined') {
            curSelect.on('select2:open', function(e) {
                $(e.delegateTarget).parent().find('.select2-container').addClass('select2-container--full');
                $(e.delegateTarget).parent().find('.select2-search--inline input').attr('placeholder', curSelect.attr('data-searchplaceholder'));
            });
        }
        if (curSelect.find('option:selected').length > 0 && curSelect.find('option:selected').html() != '') {
            curSelect.trigger({type: 'select2:select'})
        }
    });

    curForm.find('.form-input-date input').on('change', function() {
        var curValue = $(this).val();
        if (curValue.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/)) {
            var userDate = new Date(curValue.substr(6, 4), Number(curValue.substr(3, 2)) - 1, Number(curValue.substr(0, 2)));
            var isCorrectDate = true;
            if ($(this).attr('min')) {
                var minDateStr = $(this).attr('min');
                var minDate = new Date(minDateStr.substr(6, 4), Number(minDateStr.substr(3, 2)) - 1, Number(minDateStr.substr(0, 2)));
                if (userDate < minDate) {
                    isCorrectDate = false;
                }
            }
            if ($(this).attr('max')) {
                var maxDateStr = $(this).attr('max');
                var maxDate = new Date(maxDateStr.substr(6, 4), Number(maxDateStr.substr(3, 2)) - 1, Number(maxDateStr.substr(0, 2)));
                if (userDate > maxDate) {
                    isCorrectDate = false;
                }
            }
            if (isCorrectDate) {
                var myDatepicker = $(this).data('datepicker');
                if (myDatepicker) {
                    var curValueArray = curValue.split('.');
                    myDatepicker.selectDate(new Date(Number(curValueArray[2]), Number(curValueArray[1]) - 1, Number(curValueArray[0])));
                }
            } else {
                var myDatepicker = $(this).data('datepicker');
                if (myDatepicker) {
                    myDatepicker.clear();
                }
            }
        }
    });

    curForm.find('.form-input-date input').on('keyup', function() {
        var curValue = $(this).val();
        if (curValue.match(/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/)) {
            var isCorrectDate = true;
            var userDate = new Date(curValue.substr(6, 4), Number(curValue.substr(3, 2)) - 1, Number(curValue.substr(0, 2)));
            if ($(this).attr('min')) {
                var minDateStr = $(this).attr('min');
                var minDate = new Date(minDateStr.substr(6, 4), Number(minDateStr.substr(3, 2)) - 1, Number(minDateStr.substr(0, 2)));
                if (userDate < minDate) {
                    isCorrectDate = false;
                }
            }
            if ($(this).attr('max')) {
                var maxDateStr = $(this).attr('max');
                var maxDate = new Date(maxDateStr.substr(6, 4), Number(maxDateStr.substr(3, 2)) - 1, Number(maxDateStr.substr(0, 2)));
                if (userDate > maxDate) {
                    isCorrectDate = false;
                }
            }
            if (isCorrectDate) {
                var myDatepicker = $(this).data('datepicker');
                if (myDatepicker) {
                    var curValueArray = curValue.split('.');
                    myDatepicker.selectDate(new Date(Number(curValueArray[2]), Number(curValueArray[1]) - 1, Number(curValueArray[0])));
                    myDatepicker.show();
                    $(this).focus();
                }
            } else {
                $(this).addClass('error');
                return false;
            }
        }
    });

    curForm.find('.form-input-date input').each(function() {
        var minDateText = $(this).attr('min');
        var minDate = null;
        if (typeof (minDateText) != 'undefined') {
            var minDateArray = minDateText.split('.');
            minDate = new Date(Number(minDateArray[2]), Number(minDateArray[1]) - 1, Number(minDateArray[0]));
        }
        var maxDateText = $(this).attr('max');
        var maxDate = null;
        if (typeof (maxDateText) != 'undefined') {
            var maxDateArray = maxDateText.split('.');
            maxDate = new Date(Number(maxDateArray[2]), Number(maxDateArray[1]) - 1, Number(maxDateArray[0]));
        }
        if ($(this).hasClass('maxDate1Year')) {
            var curDate = new Date();
            curDate.setFullYear(curDate.getFullYear() + 1);
            curDate.setDate(curDate.getDate() - 1);
            maxDate = curDate;
            var maxDay = curDate.getDate();
            if (maxDay < 10) {
                maxDay = '0' + maxDay
            }
            var maxMonth = curDate.getMonth() + 1;
            if (maxMonth < 10) {
                maxMonth = '0' + maxMonth
            }
            $(this).attr('max', maxDay + '.' + maxMonth + '.' + curDate.getFullYear());
        }
        var startDate = new Date();
        if (typeof ($(this).attr('value')) != 'undefined') {
            var curValue = $(this).val();
            if (curValue != '') {
                var startDateArray = curValue.split('.');
                startDate = new Date(Number(startDateArray[2]), Number(startDateArray[1]) - 1 , Number(startDateArray[0]));
            }
        }
        $(this).datepicker({
            language: 'ru',
            minDate: minDate,
            maxDate: maxDate,
            startDate: startDate,
            autoClose: true,
            toggleSelected: false,
            prevHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>',
            nextHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>'
        });
        if (typeof ($(this).attr('value')) != 'undefined') {
            var curValue = $(this).val();
            if (curValue != '') {
                var startDateArray = curValue.split('.');
                startDate = new Date(Number(startDateArray[2]), Number(startDateArray[1]) - 1 , Number(startDateArray[0]));
                $(this).data('datepicker').selectDate(startDate);
            }
        }
    });

    window.setInterval(function() {
        $('.form-input-date input').each(function() {
            if ($(this).val() != '') {
                $(this).parent().addClass('focus');
            }
        });
    }, 100);

    curForm.validate({
        ignore: ''
    });
}

function getSecondsText(number) {
    var endings = Array('секунд', 'секунду', 'секунды');
    var num100 = number % 100;
    var num10 = number % 10;
    if (num100 >= 5 && num100 <= 20) {
        return endings[0];
    } else if (num10 == 0) {
        return endings[0];
    } else if (num10 == 1) {
        return endings[1];
    } else if (num10 >= 2 && num10 <= 4) {
        return endings[2];
    } else if (num10 >= 5 && num10 <= 9) {
        return endings[0];
    } else {
        return endings[2];
    }
}