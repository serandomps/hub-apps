var dust = require('dust')();
var serand = require('serand');
var redirect = serand.redirect;

var user;

var apps;

dust.loadSource(dust.compile(require('./template'), 'hub-apps-main'));
dust.loadSource(dust.compile(require('./list'), 'hub-apps-list'));
dust.loadSource(dust.compile(require('./add'), 'hub-apps-add'));
dust.loadSource(dust.compile(require('./details'), 'hub-apps-details'));

var list = function (options, parent, done) {
    serand.once('hub', 'apps listed', function (data) {
        dust.render('hub-apps-list', data, function (err, out) {
            if (err) {
                done(err);
                return;
            }
            var el = $(out);
            $('.details', el).on('click', function () {
                redirect('/apps/' + $(this).parent().data('id'));
            });
            $('.deploy', el).on('click', function () {
                $.ajax({
                    method: 'POST',
                    url: '/apis/v/apps/' + $(this).parent().data('id') + '/deploy',
                    headers: {
                        'X-Host': 'hub.serandives.com:4000'
                    },
                    dataType: 'json',
                    success: function (data) {

                    },
                    error: function () {

                    }
                });
            });
            $('.delete', el).on('click', function () {
                $.ajax({
                    method: 'DELETE',
                    url: '/apis/v/apps/' + $(this).parent().data('id'),
                    headers: {
                        'X-Host': 'hub.serandives.com:4000'
                    },
                    dataType: 'json',
                    success: function (data) {
                        redirect('/apps');
                    },
                    error: function () {

                    }
                });
            });
            parent.html(el);
            done();
        });
    });
    serand.emit('hub', 'apps list');
};

var add = function (options, parent, done) {
    dust.render('hub-apps-add', options, function (err, out) {
        if (err) {
            done(err);
            return;
        }
        var el = $(out);
        $.ajax({
            url: '/apis/v/domains',
            headers: {
                'X-Host': 'hub.serandives.com:4000'
            },
            dataType: 'json',
            success: function (data) {
                var html = '';
                data.forEach(function (domain) {
                    html += '<option value="' + domain.id + '">' + domain.name + '</option>';
                });
                $('.balancers', el).html(html);
            },
            error: function () {
                done(true);
            }
        });
        $('.add', el).click(function () {
            $.ajax({
                method: 'POST',
                url: '/apis/v/apps',
                headers: {
                    'X-Host': 'hub/serandives.com:4000'
                },
                data: {
                    name: $('.app', el).val(),
                    repo: $('.repo', el).val()
                },
                dataType: 'json',
                success: function (data) {
                    console.log(data);
                    redirect('/apps');
                },
                error: function () {

                }
            });
            return false;
        });
        parent.html(el);
        done();
    });
};

var details = function (options, parent, done) {
    $.ajax({
        url: '/apis/v/apps/' + options.id,
        headers: {
            'X-Host': 'hub.serandives.com:4000'
        },
        dataType: 'json',
        success: function (data) {
            dust.render('hub-apps-details', data, function (err, out) {
                if (err) {
                    done(err);
                    return;
                }
                var el = $(out);
                $.ajax({
                    url: '/apis/v/servers',
                    headers: {
                        'X-Host': 'hub.serandives.com:4000'
                    },
                    dataType: 'json',
                    success: function (data) {
                        var html = '';
                        data.forEach(function (server) {
                            html += '<option value="' + server.id + '">' + server.ip + '</option>';
                        });
                        $('.servers', el).html(html);
                    },
                    error: function () {
                        done(true);
                    }
                });
                $('.add', el).click(function () {
                    var app = $(this).data('app');
                    var server = $('.servers', el).val();
                    console.log('emitting event : ' + server + ' ' + app);
                    serand.emit('hub', 'drone start', {
                        server: server,
                        app: app
                    });
                    return false;
                });
                parent.html(el);
                done();
            });
        },
        error: function () {
            done(true);
        }
    });
};

var render = function (action, sandbox, fn, options, next) {
    dust.render('hub-apps-main', options, function (err, out) {
        if (err) {
            fn(err);
            return;
        }
        var el = $(out).appendTo(sandbox);
        $('.' + action, el).addClass('active');
        next(options, $('.content', el), function (err) {
            fn(err, function () {
                $('.hub-apps-main', sandbox).remove();
            });
        });
    });
};

var listMenu = [
    {
        title: 'Apps',
        url: '/apps',
        action: 'list'
    },
    {
        title: 'Add',
        url: '/apps/add',
        action: 'add'
    }
];

module.exports = function (sandbox, fn, options) {
    var action = options.action || 'list';
    switch (action) {
        case 'list':
            options.menu = listMenu;
            render('list', sandbox, fn, options, list);
            return;
        case 'add':
            options.menu = listMenu;
            render('add', sandbox, fn, options, add);
            return;
        case 'details':
            options.menu = [
                {title: 'Drones', url: '/apps/' + options.id + '/drones', action: 'drones'}
            ];
            render('details', sandbox, fn, options, details);
            return;
    }
};

var app = function (id) {
    var d;
    apps.every(function (dom) {
        if (dom.id === id) {
            d = dom;
            return false;
        }
        return true;
    });
    return d;
};

serand.on('hub', 'apps list', function (id) {
    /*if (apps) {
     serand.emit('hub', 'apps listed', (id ? app(id) : apps));
     return;
     }*/
    $.ajax({
        url: '/apis/v/apps',
        headers: {
            'X-Host': 'hub.serandives.com:4000'
        },
        dataType: 'json',
        success: function (data) {
            apps = data;
            serand.emit('hub', 'apps listed', id ? app(id) : apps);
        },
        error: function () {
            apps = [];
            serand.emit('hub', 'apps listed', []);
        }
    });
});
